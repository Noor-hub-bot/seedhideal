"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import {
  createEmailOtpChallenge,
  createSessionForUser,
  createUserWithPassword,
  getSessionUser,
  getUserByEmail,
  hashPassword,
  markEmailVerified,
  SESSION_COOKIE,
  sessionCookieOptions,
  signOutCurrentSession,
  verifyEmailOtp,
  verifyPassword,
  type OtpPurpose,
} from "@/lib/auth";
import { db, otpChallenges, users, auditLog } from "@/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { CITIES } from "@/lib/constants";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, detectFileType, uploadAvatar } from "@/lib/storage";
import { signIn } from "@/auth";

export async function signInWithGoogleAction(): Promise<void> {
  await signIn("google", { redirectTo: "/google-bridge" });
}

const RESET_COOKIE = "sd_reset_challenge";
const RESET_TOKEN_MINUTES = 10;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export type AuthActionState = { error?: string };

// ---------- Sign up ----------

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().toLowerCase().min(1, "Enter your email").email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal("on"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function signUpAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    if (first.path[0] === "acceptTerms") return { error: "Please accept the Terms of Service and Privacy Policy." };
    return { error: first.message };
  }
  const { fullName, email, password } = parsed.data;

  const ip = await getClientIp();
  if (!checkRateLimit(`login:ip:${ip}`, 20, 60 * 60 * 1000)) {
    return { error: "Too many attempts from your network. Please try again later." };
  }

  const existing = await getUserByEmail(email);
  if (existing) return { error: "An account with this email already exists." };

  await createUserWithPassword({ email, passwordHash: hashPassword(password), displayName: fullName });

  const otp = await createEmailOtpChallenge(email, "verify_email");
  if (!otp.ok) return { error: otp.error };

  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

// ---------- Sign in ----------

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function signInAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, next } = parsed.data;

  const ip = await getClientIp();
  if (
    !checkRateLimit(`login:ip:${ip}`, 20, 60 * 60 * 1000) ||
    !checkRateLimit(`login:email:${email}`, 10, 60 * 60 * 1000)
  ) {
    return { error: "Too many sign-in attempts. Please try again later." };
  }

  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "Incorrect email or password." };
  }
  if (user.status === "deactivated") return { error: "This account is deactivated. Contact support." };

  if (!user.emailVerifiedAt) {
    const otp = await createEmailOtpChallenge(email, "verify_email");
    if (!otp.ok) return { error: otp.error };
    redirect(`/verify?email=${encodeURIComponent(email)}`);
  }

  const { token, expiresAt } = await createSessionForUser(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  redirect(next && next.startsWith("/") ? next : "/dashboard");
}

// ---------- Email verification (signup) ----------

export type OtpActionState = { error?: string; sent?: boolean };

export async function verifyEmailAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  if (!email) return { error: "Missing email — please sign up again." };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };

  const result = await verifyEmailOtp(email, code, "verify_email");
  if (!result.ok) return { error: result.error };

  const user = await getUserByEmail(email);
  if (!user) return { error: "Account not found. Please sign up again." };

  await markEmailVerified(user.id);
  const { token, expiresAt } = await createSessionForUser(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  redirect("/verify/success");
}

export async function resendOtpAction(_prev: OtpActionState, formData: FormData): Promise<OtpActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const purpose = String(formData.get("purpose") ?? "verify_email") as OtpPurpose;
  if (!email) return { error: "Missing email." };

  const ip = await getClientIp();
  if (
    !checkRateLimit(`otp:ip:${ip}`, 10, 60 * 60 * 1000) ||
    !checkRateLimit(`otp:email:${email}`, 5, 60 * 60 * 1000)
  ) {
    return { error: "Too many code requests. Please try again later." };
  }

  const result = await createEmailOtpChallenge(email, purpose);
  if (!result.ok) return { error: result.error };
  return { sent: true };
}

// ---------- Forgot / reset password ----------

const emailOnlySchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email").email("Enter a valid email address"),
});

export async function forgotPasswordAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email } = parsed.data;

  const ip = await getClientIp();
  if (
    !checkRateLimit(`otp:ip:${ip}`, 10, 60 * 60 * 1000) ||
    !checkRateLimit(`otp:email:${email}`, 5, 60 * 60 * 1000)
  ) {
    return { error: "Too many requests. Please try again later." };
  }

  // Always the same outcome regardless of whether the account exists — avoids
  // leaking which emails are registered.
  const user = await getUserByEmail(email);
  if (user) await createEmailOtpChallenge(email, "reset_password");

  redirect(`/reset-password/verify?email=${encodeURIComponent(email)}`);
}

export async function resetPasswordVerifyAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  if (!email) return { error: "Missing email — please start again." };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };

  const result = await verifyEmailOtp(email, code, "reset_password");
  if (!result.ok) return { error: result.error };

  const cookieStore = await cookies();
  cookieStore.set(RESET_COOKIE, `${result.challengeId}:${email}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RESET_TOKEN_MINUTES * 60,
  });
  redirect("/reset-password/new");
}

const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function resetPasswordNewAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RESET_COOKIE)?.value;
  if (!raw) return { error: "Your reset session expired. Please request a new code." };
  const [challengeId, email] = raw.split(":");

  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.id, challengeId),
        eq(otpChallenges.email, email),
        eq(otpChallenges.purpose, "reset_password"),
        gt(otpChallenges.expiresAt, new Date(Date.now() - RESET_TOKEN_MINUTES * 60 * 1000)),
      ),
    );
  if (!challenge || !challenge.consumedAt) {
    return { error: "Your reset session expired. Please request a new code." };
  }

  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await getUserByEmail(email);
  if (!user) return { error: "Account not found." };

  await db.update(users).set({ passwordHash: hashPassword(parsed.data.password) }).where(eq(users.id, user.id));
  cookieStore.delete(RESET_COOKIE);
  redirect("/reset-password/success");
}

// ---------- Sign out ----------

export async function signOutAction() {
  await signOutCurrentSession();
  redirect("/");
}

// ---------- Profile ----------

export async function updateProfileAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 100);
  const city = String(formData.get("city") ?? "").trim().slice(0, 64);
  if (!displayName || !city) return;
  await db
    .update(users)
    .set({ displayName, city })
    .where(eq(users.id, user.id));
  await db.insert(auditLog).values({
    actorId: user.id,
    objectType: "user",
    objectId: user.id,
    action: "profile_updated",
  });
  redirect("/dashboard");
}

const completeProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().max(16).optional().or(z.literal("")),
  city: z.enum(CITIES as [string, ...string[]], "Select your city"),
});

export async function completeProfileAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const parsed = completeProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { fullName, phone, city } = parsed.data;

  let avatarUrl: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.has(avatar.type)) return { error: "Photo must be a JPEG, PNG or WEBP image." };
    if (avatar.size > MAX_PHOTO_BYTES) return { error: "Photo is too large." };
    const bytes = new Uint8Array(await avatar.arrayBuffer());
    if (!detectFileType(bytes)) return { error: "Could not verify photo file type." };
    avatarUrl = await uploadAvatar(avatar, user.id);
  }

  try {
    await db
      .update(users)
      .set({
        displayName: fullName,
        phone: phone || null,
        city,
        ...(avatarUrl ? { avatarUrl } : {}),
      })
      .where(eq(users.id, user.id));
  } catch {
    return { error: "That phone number is already in use on another account." };
  }

  redirect("/account-created");
}
