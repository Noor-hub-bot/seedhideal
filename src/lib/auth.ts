import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, otpChallenges, sessions, users } from "@/db";
import { sendSms } from "@/lib/sms";
import { twilioCheckVerification, twilioStartVerification } from "@/lib/otp-twilio";
import { TERMS_VERSION } from "@/lib/constants";

const SESSION_COOKIE = "sd_session";
const SESSION_DAYS = 30;
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;

/** Normalize any common Pakistani mobile format to +923XXXXXXXXX, or null if invalid. */
export function normalizePkPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "");
  let rest: string | null = null;
  if (/^\+923\d{9}$/.test(digits)) rest = digits.slice(3);
  else if (/^00923\d{9}$/.test(digits)) rest = digits.slice(4);
  else if (/^923\d{9}$/.test(digits)) rest = digits.slice(2);
  else if (/^03\d{9}$/.test(digits)) rest = digits.slice(1);
  return rest ? `+92${rest}` : null;
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

/** Local dev fallback (no real SMS provider) — code is generated and hashed here,
 * and delivered via the console adapter in @/lib/sms. Used only when OTP_DEV_MODE=true. */
async function createLocalOtpChallenge(
  phone: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const recent = await db
    .select({ count: sql<number>`count(*)` })
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.phone, phone),
        gt(otpChallenges.createdAt, sql`now() - interval '1 hour'`),
      ),
    );
  if (Number(recent[0].count) >= OTP_MAX_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Please try again in an hour." };
  }

  const code = randomInt(100000, 1000000).toString();
  await db.insert(otpChallenges).values({
    phone,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  await sendSms(
    phone,
    `Your SeedhiDeal verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
  );
  return { ok: true };
}

async function verifyLocalOtp(
  phone: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.phone, phone),
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
  return { ok: true };
}

const isDevOtp = () => process.env.OTP_DEV_MODE === "true";

export async function createOtpChallenge(
  phone: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return isDevOtp() ? createLocalOtpChallenge(phone) : twilioStartVerification(phone);
}

export async function verifyOtpAndSignIn(
  phone: string,
  code: string,
  acceptedTerms: boolean,
): Promise<{ ok: true; isNewUser: boolean } | { ok: false; error: string }> {
  const verified = isDevOtp()
    ? await verifyLocalOtp(phone, code)
    : await twilioCheckVerification(phone, code);
  if (!verified.ok) return verified;

  // One verified phone = one account (ACC-02)
  let [user] = await db.select().from(users).where(eq(users.phone, phone));
  let isNewUser = false;
  if (!user) {
    [user] = await db.insert(users).values({ phone }).returning();
    isNewUser = true;
  }
  if (user.status === "deactivated")
    return { ok: false, error: "This account is deactivated. Contact support." };

  if (acceptedTerms && user.termsVersion !== TERMS_VERSION) {
    await db
      .update(users)
      .set({ termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId: user.id, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return { ok: true, isNewUser };
}

export type SessionUser = typeof users.$inferSelect;

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
