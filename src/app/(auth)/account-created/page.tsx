import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthButton, AuthCard } from "@/components/auth/ui";

export const metadata: Metadata = { title: "Account Created" };

const CONFETTI = [
  { left: "12%", top: "8%", color: "#14BBA4", delay: "0s" },
  { left: "82%", top: "14%", color: "#0F172A", delay: "0.15s" },
  { left: "22%", top: "70%", color: "#FBBF24", delay: "0.3s" },
  { left: "70%", top: "68%", color: "#14BBA4", delay: "0.45s" },
  { left: "45%", top: "10%", color: "#F87171", delay: "0.2s" },
  { left: "88%", top: "55%", color: "#0F172A", delay: "0.35s" },
];

export default async function AccountCreatedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <AuthCard className="relative overflow-hidden text-center">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="absolute h-2 w-2 rounded-sm"
          style={{ left: c.left, top: c.top, backgroundColor: c.color, animation: `sd-confetti-fall 2.2s ease-in ${c.delay} infinite` }}
        />
      ))}
      <style>{`
        @keyframes sd-confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(60px) rotate(200deg); opacity: 0; }
        }
      `}</style>

      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#14BBA4]">
        <svg viewBox="0 0 40 40" className="h-12 w-12" fill="none">
          <path d="M12 21l6 6 10-13" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#0F172A]">
        Welcome to SeedhiDeal!
      </h1>
      <p className="mt-1.5 mb-7 text-sm text-slate-500">
        Your account is ready to go. Explore thousands of cars and find the perfect one.
      </p>
      <Link href="/">
        <AuthButton type="button" variant="teal">
          Explore Cars
        </AuthButton>
      </Link>
    </AuthCard>
  );
}
