import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SignInForm } from "./signin-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-[32px] font-medium leading-tight">Log in to SeedhiDeal</h1>
      <p className="mt-2 text-sm text-muted">
        We verify every user by phone. Enter your Pakistani mobile number and
        we&apos;ll send you a 6-digit code — no password needed.
      </p>
      <div className="mt-6">
        <SignInForm />
      </div>
    </div>
  );
}
