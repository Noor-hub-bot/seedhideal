import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SplashScreen } from "@/components/auth/splash-screen";

export const metadata: Metadata = { title: "SeedhiDeal" };

// New, additive entry point (/splash) — not part of any existing redirect
// chain, so nothing that already links to /welcome or /sign-in needs to
// change. Already-signed-in visitors skip straight to the dashboard, same
// pattern as every other page in this route group.
export default async function SplashPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return <SplashScreen />;
}
