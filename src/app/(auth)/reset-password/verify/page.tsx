import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resetPasswordVerifyAction } from "@/lib/actions/auth";
import { AuthBackLink, AuthCard } from "@/components/auth/ui";
import { OtpForm } from "@/components/auth/otp-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) redirect("/forgot-password");

  return (
    <AuthCard className="text-center">
      <div className="mb-1 text-left">
        <AuthBackLink href="/forgot-password" />
      </div>
      <h1 className="font-[family-name:var(--font-poppins)] text-xl font-semibold text-[#0F172A]">Reset Password</h1>
      <p className="mt-1.5 mb-6 text-sm text-slate-500">
        Enter the 6-digit code sent to <span className="font-medium text-[#0F172A]">{email}</span>
      </p>

      <OtpForm email={email} purpose="reset_password" verifyAction={resetPasswordVerifyAction} />
    </AuthCard>
  );
}
