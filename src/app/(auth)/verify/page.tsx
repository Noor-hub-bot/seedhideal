import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyEmailAction } from "@/lib/actions/auth";
import { AuthCard } from "@/components/auth/ui";
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
      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#14BBA4]/10">
        <svg viewBox="0 0 40 40" className="h-12 w-12" fill="none">
          <rect x="5" y="10" width="30" height="21" rx="4" stroke="#14BBA4" strokeWidth="2" />
          <path d="m7 12 13 10 13-10" stroke="#14BBA4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="30" cy="28" r="7" fill="#14BBA4" />
          <path d="m27 28 2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="font-[family-name:var(--font-poppins)] text-xl font-semibold text-[#0F172A]">Verify Your Email</h1>
      <p className="mt-1.5 mb-6 text-sm text-slate-500">
        We&apos;ve sent a 6-digit code to <span className="font-medium text-[#0F172A]">{email}</span>
      </p>

      <OtpForm email={email} purpose="verify_email" verifyAction={verifyEmailAction} />
    </AuthCard>
  );
}
