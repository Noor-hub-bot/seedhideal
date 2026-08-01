import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, otpChallenges, sessions, users } from "@/db";
import { sendOtpEmail } from "@/lib/email";
import { TERMS_VERSION } from "@/lib/constants";

export const SESSION_COOKIE = "sd_session";
const SESSION_DAYS = 30;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

export type OtpPurpose = "verify_email" | "reset_password";

// ---------- Passwords (node:crypto scrypt — no external dependency) ----------

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const storedBuffer = Buffer.from(hash, "hex");
  if (candidate.length !== storedBuffer.length) return false;
  return timingSafeEqual(candidate, storedBuffer);
}

// ---------- Email OTP (verification + password reset) ----------

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function createEmailOtpChallenge(
  email: string,
  purpose: OtpPurpose,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [last] = await db
    .select()
    .from(otpChallenges)
    .where(and(eq(otpChallenges.email, email), eq(otpChallenges.purpose, purpose)))
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);

  if (last) {
    const elapsedMs = Date.now() - last.createdAt.getTime();
    if (elapsedMs < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      const waitSeconds = OTP_RESEND_COOLDOWN_SECONDS - Math.floor(elapsedMs / 1000);
      return { ok: false, error: `Please wait ${waitSeconds}s before requesting another code.` };
    }
  }

  const recent = await db
    .select({ count: sql<number>`count(*)` })
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.email, email),
        eq(otpChallenges.purpose, purpose),
        gt(otpChallenges.createdAt, sql`now() - interval '1 hour'`),
      ),
    );
  if (Number(recent[0].count) >= OTP_MAX_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Please try again in an hour." };
  }

  const code = randomInt(100000, 1000000).toString();
  await db.insert(otpChallenges).values({
    email,
    purpose,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  await sendOtpEmail(email, code, purpose);
  return { ok: true };
}

export async function verifyEmailOtp(
  email: string,
  code: string,
  purpose: OtpPurpose,
): Promise<{ ok: true; challengeId: string } | { ok: false; error: string }> {
  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.email, email),
        eq(otpChallenges.purpose, purpose),
        isNull(otpChallenges.consumedAt),
        gt(otpChallenges.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);

  if (!challenge) return { ok: false, error: "Code expired or not found. Request a new one." };
  if (challenge.attempts >= OTP_MAX_ATTEMPTS)
    return { ok: false, error: "Too many attempts. Request a new code." };

  if (challenge.codeHash !== hashCode(code)) {
    await db
      .update(otpChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(otpChallenges.id, challenge.id));
    return { ok: false, error: "Incorrect code. Please check and try again." };
  }

  await db
    .update(otpChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(otpChallenges.id, challenge.id));
  return { ok: true, challengeId: challenge.id };
}

// ---------- Users ----------

export type SessionUser = typeof users.$inferSelect;

export async function getUserByEmail(email: string): Promise<SessionUser | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export async function createUserWithPassword(params: {
  email: string;
  passwordHash: string;
  displayName: string;
}): Promise<SessionUser> {
  const [user] = await db
    .insert(users)
    .values({
      email: params.email,
      passwordHash: params.passwordHash,
      displayName: params.displayName,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
    })
    .returning();
  return user;
}

export async function markEmailVerified(userId: string): Promise<void> {
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
}

/** Find a user by Google's stable subject id, falling back to email (and linking the
 * Google id onto that account). Creates a new user if neither match. Google emails
 * are pre-verified, so a freshly created or newly linked account is marked verified. */
export async function findOrCreateGoogleUser(params: {
  googleId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<{ user: SessionUser; isNewUser: boolean }> {
  const [byGoogleId] = await db.select().from(users).where(eq(users.googleId, params.googleId));
  if (byGoogleId) return { user: byGoogleId, isNewUser: false };

  const [byEmail] = await db.select().from(users).where(eq(users.email, params.email));
  if (byEmail) {
    const [linked] = await db
      .update(users)
      .set({ googleId: params.googleId, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() })
      .where(eq(users.id, byEmail.id))
      .returning();
    return { user: linked, isNewUser: false };
  }

  const [created] = await db
    .insert(users)
    .values({
      googleId: params.googleId,
      email: params.email,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl,
      emailVerifiedAt: new Date(),
    })
    .returning();
  return { user: created, isNewUser: true };
}

// ---------- Sessions ----------

/** Creates a session row for an already-authenticated user and returns its token/expiry.
 * Shared by password sign-in, post-email-verification sign-in, and the Google OAuth
 * bridge — this is the single place a session gets created, everything else
 * (getSessionUser, isStaff, the 40+ pages/actions that gate on them) is unchanged
 * regardless of how the user got here.
 *
 * Deliberately does NOT set the cookie itself: cookies() may only be *written* from
 * a Server Action or Route Handler, and this function is called from both (Server
 * Actions here in lib/actions/auth.ts, and the /google-bridge Route Handler, which
 * writes to a NextResponse instead of the cookies() store). Callers must set
 * SESSION_COOKIE to `token` themselves, using sessionCookieOptions(expiresAt). */
export async function createSessionForUser(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  return { token, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.token, token),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    );
  return rows[0]?.user ?? null;
}

export async function signOutCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.token, token));
    cookieStore.delete(SESSION_COOKIE);
  }
}

const STAFF_ROLES = new Set(["reviewer", "moderator", "support", "admin"]);

export function isStaff(user: SessionUser | null): boolean {
  return !!user && STAFF_ROLES.has(user.role);
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");
  return user;
}
