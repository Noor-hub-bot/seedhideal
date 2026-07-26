import type { Metadata } from "next";
import { AuthBackLink, AuthCard } from "@/components/auth/ui";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard className="text-center">
      <div className="mb-1 text-left">
        <AuthBackLink href="/sign-in" />
      </div>
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#14BBA4]/10">
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
          <rect x="9" y="18" width="22" height="16" rx="3" stroke="#14BBA4" strokeWidth="2" />
          <path d="M14 18v-4a6 6 0 1 1 12 0v4" stroke="#14BBA4" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 24v4" stroke="#14BBA4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="font-[family-name:var(--font-poppins)] text-xl font-semibold text-[#0F172A]">Forgot Password?</h1>
      <p className="mt-1.5 mb-6 text-sm text-slate-500">Enter your email and we&apos;ll send you a code to reset your password.</p>

      <div className="text-left">
        <ForgotPasswordForm />
      </div>
    </AuthCard>
  );
}
