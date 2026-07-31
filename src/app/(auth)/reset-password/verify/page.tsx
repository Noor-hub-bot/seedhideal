import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resetPasswordVerifyAction } from "@/lib/actions/auth";
import { AuthBackLink, AuthCard, AuthHeading, AuthIconBadge } from "@/components/auth/ui";
import { LockIcon } from "@/components/auth/icons";
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
      <div className="mb-2 text-left">
        <AuthBackLink href="/forgot-password" />
      </div>

      <AuthIconBadge tone="accent" size={72}>
        <LockIcon className="h-8 w-8" />
      </AuthIconBadge>

      <AuthHeading center subtitle={
        <>Enter the 6-digit code sent to <span className="font-medium text-[#111827]">{email}</span></>
      }>
        Reset Password
      </AuthHeading>

      <OtpForm email={email} purpose="reset_password" verifyAction={resetPasswordVerifyAction} />
    </AuthCard>
  );
}
