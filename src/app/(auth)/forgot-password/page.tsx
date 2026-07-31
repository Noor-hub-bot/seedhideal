import type { Metadata } from "next";
import { AuthBackLink, AuthCard, AuthHeading, AuthIconBadge } from "@/components/auth/ui";
import { KeyIcon } from "@/components/auth/icons";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard className="text-center">
      <div className="mb-2 text-left">
        <AuthBackLink href="/sign-in" />
      </div>

      <AuthIconBadge tone="accent" size={72}>
        <KeyIcon className="h-8 w-8" />
      </AuthIconBadge>

      <AuthHeading center subtitle="Enter your email and we'll send you a code to reset your password.">
        Forgot Password?
      </AuthHeading>

      <div className="text-left">
        <ForgotPasswordForm />
      </div>
    </AuthCard>
  );
}
