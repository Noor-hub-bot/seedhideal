import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthButton, AuthCard } from "@/components/auth/ui";
import { CheckCircleIcon } from "@/components/auth/icons";

export const metadata: Metadata = { title: "Email Verified" };

export default async function VerifySuccessPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <AuthCard className="text-center">
      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#14BBA4]">
        <CheckCircleIcon className="h-14 w-14 text-white" />
      </div>
      <h1 className="font-[family-name:var(--font-poppins)] text-xl font-semibold text-[#0F172A]">Email Verified!</h1>
      <p className="mt-1.5 mb-7 text-sm text-slate-500">Your email has been verified successfully.</p>
      <Link href="/dashboard">
        <AuthButton type="button">Continue</AuthButton>
      </Link>
    </AuthCard>
  );
}
