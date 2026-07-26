import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthCard, AuthHeading, AuthWordmark } from "@/components/auth/ui";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign In" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const { next } = await searchParams;

  return (
    <AuthCard>
      <AuthWordmark />
      <AuthHeading subtitle="Glad to see you again!">Welcome Back</AuthHeading>
      <SignInForm next={next} />
    </AuthCard>
  );
}
