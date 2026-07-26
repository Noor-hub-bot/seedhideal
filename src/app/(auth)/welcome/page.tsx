import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthButton, AuthCard } from "@/components/auth/ui";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <AuthCard className="text-center">
      <p className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#0F172A]">SeedhiDeal</p>
      <p className="mt-1 text-sm text-slate-500">Find Your Perfect Car</p>

      <div className="mx-auto my-8 flex h-40 w-40 items-center justify-center rounded-full bg-[#14BBA4]/10">
        <svg viewBox="0 0 64 64" className="h-24 w-24" fill="none">
          <path
            d="M8 40h4l4-10a4 4 0 0 1 3.7-2.5h24.6A4 4 0 0 1 48 30l4 10h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2a4 4 0 1 1-8 0H20a4 4 0 1 1-8 0h-2a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
            fill="#14BBA4"
          />
          <circle cx="18" cy="46" r="3.5" fill="#0F172A" />
          <circle cx="46" cy="46" r="3.5" fill="#0F172A" />
        </svg>
      </div>

      <Link href="/sign-up">
        <AuthButton type="button">Create Account</AuthButton>
      </Link>

      <p className="mt-5 text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-[#14BBA4] hover:text-[#109c88]">
          Sign In
        </Link>
      </p>
    </AuthCard>
  );
}
