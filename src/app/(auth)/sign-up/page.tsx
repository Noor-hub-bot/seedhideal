import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthBackLink, AuthCard, AuthHeading } from "@/components/auth/ui";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create Account" };

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <AuthCard>
      <AuthBackLink href="/welcome" />
      <p className="mb-2 font-[family-name:var(--font-poppins)] text-lg font-bold tracking-[-0.01em] text-[#0F172A]">
        SeedhiDeal
      </p>
      <AuthHeading subtitle="Join SeedhiDeal today">Create Your Account</AuthHeading>
      <SignUpForm />
    </AuthCard>
  );
}
