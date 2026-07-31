import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthButton, AuthCard, AuthIconBadge } from "@/components/auth/ui";
import { BrandMarkIcon } from "@/components/auth/icons";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <AuthCard className="text-center">
      <p className="font-[family-name:var(--font-poppins)] text-2xl font-bold tracking-[-0.01em] text-[#0F172A]">
        SeedhiDeal
      </p>
      <p className="mt-2 text-[15px] text-[#6B7280]">Find Your Perfect Car</p>

      <AuthIconBadge tone="accent" size={144} className="my-8">
        <BrandMarkIcon className="h-16 w-16" />
      </AuthIconBadge>

      <div className="space-y-4">
        <Link href="/sign-up">
          <AuthButton type="button">Create Account</AuthButton>
        </Link>
        <Link href="/sign-in">
          <AuthButton type="button" variant="secondary">
            Sign In
          </AuthButton>
        </Link>
      </div>

      <p className="mt-8 text-[13px] leading-relaxed text-[#9CA3AF]">
        Real owners, real buyers — every listing identity &amp; ownership verified.
      </p>
    </AuthCard>
  );
}
