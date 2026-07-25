"use server";

import { redirect } from "next/navigation";
import {
  createOtpChallenge,
  getSessionUser,
  normalizePkPhone,
  signOutCurrentSession,
  verifyOtpAndSignIn,
} from "@/lib/auth";
import { db, users, auditLog } from "@/db";
import { eq } from "drizzle-orm";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { TERMS_VERSION } from "@/lib/constants";

export type AuthFormState = {
  step: "phone" | "code";
  phone?: string;
  needsTerms?: boolean;
  error?: string;
};

export async function requestOtpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = String(formData.get("phone") ?? "");
  const phone = normalizePkPhone(raw);
  if (!phone) {
    return {
      step: "phone",
      error: "Enter a valid Pakistani mobile number, e.g. 0300 1234567.",
    };
  }

  const ip = await getClientIp();
  if (!checkRateLimit(`otp:ip:${ip}`, 10, 60 * 60 * 1000)) {
    return {
      step: "phone",
      error: "Too many code requests from your network. Please try again later.",
    };
  }

  const result = await createOtpChallenge(phone);
  if (!result.ok) return { step: "phone", error: result.error };

  const [existing] = await db.select().from(users).where(eq(users.phone, phone));
  const needsTerms = !existing || existing.termsVersion !== TERMS_VERSION;
  return { step: "code", phone, needsTerms };
}

export async function verifyOtpAction(
  prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const phone = prev.phone;
  if (!phone) return { step: "phone", error: "Please enter your number again." };
  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { step: "code", phone, needsTerms: prev.needsTerms, error: "Enter the 6-digit code." };
  }
  const acceptedTerms = formData.get("acceptTerms") === "on";
  if (prev.needsTerms && !acceptedTerms) {
    return {
      step: "code",
      phone,
      needsTerms: true,
      error: "Please accept the Terms of Service to continue.",
    };
  }
  const result = await verifyOtpAndSignIn(phone, code, acceptedTerms);
  if (!result.ok) {
    return { step: "code", phone, needsTerms: prev.needsTerms, error: result.error };
  }
  redirect(result.isNewUser ? "/dashboard?welcome=1" : "/dashboard");
}

export async function signOutAction() {
  await signOutCurrentSession();
  redirect("/");
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
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
