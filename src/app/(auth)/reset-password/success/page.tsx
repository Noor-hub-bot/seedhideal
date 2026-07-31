import type { Metadata } from "next";
import Link from "next/link";
import { AuthButton, AuthCard, AuthIconBadge } from "@/components/auth/ui";
import { CheckCircleIcon } from "@/components/auth/icons";

export const metadata: Metadata = { title: "Password Updated" };

export default function ResetPasswordSuccessPage() {
  return (
    <AuthCard className="text-center">
      <AuthIconBadge tone="success">
        <CheckCircleIcon className="h-11 w-11" />
      </AuthIconBadge>

      <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-semibold tracking-[-0.01em] text-[#0F172A]">
        Password Updated!
      </h1>
      <p className="mt-2 mb-8 text-[15px] leading-relaxed text-[#6B7280]">
        Your password has been changed successfully.
      </p>

      <Link href="/sign-in">
        <AuthButton type="button">Go to Sign In</AuthButton>
      </Link>
    </AuthCard>
  );
}
