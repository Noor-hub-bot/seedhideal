import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyEmailAction } from "@/lib/actions/auth";
import { AuthCard, AuthHeading, AuthIconBadge } from "@/components/auth/ui";
import { CheckCircleIcon, MailIcon } from "@/components/auth/icons";
import { OtpForm } from "@/components/auth/otp-form";

export const metadata: Metadata = { title: "Verify Your Email" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) redirect("/sign-up");

  return (
    <AuthCard className="text-center">
      <AuthIconBadge tone="accent">
        <MailIcon className="h-8 w-8" />
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#0F766E] text-white ring-4 ring-white">
          <CheckCircleIcon className="h-4 w-4" />
        </span>
      </AuthIconBadge>

      <AuthHeading center subtitle={
        <>We&apos;ve sent a 6-digit code to <span className="font-medium text-[#111827]">{email}</span></>
      }>
        Verify Your Email
      </AuthHeading>

      <OtpForm email={email} purpose="verify_email" verifyAction={verifyEmailAction} />
    </AuthCard>
  );
}
