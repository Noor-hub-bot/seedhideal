import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthBackLink, AuthCard, AuthHeading } from "@/components/auth/ui";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = { title: "Create New Password" };

export default async function ResetPasswordNewPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("sd_reset_challenge")) redirect("/forgot-password");

  return (
    <AuthCard>
      <AuthBackLink href="/forgot-password" />
      <AuthHeading subtitle="Your new password must be different from previously used passwords.">
        Create New Password
      </AuthHeading>
      <NewPasswordForm />
    </AuthCard>
  );
}

