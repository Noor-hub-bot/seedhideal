import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq, gt, isNull, or } from "drizzle-orm";
import { db, dealerProfiles, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { DealerProfileForm } from "./dealer-profile-form";

export const metadata: Metadata = { title: "Dealer profile" };

export default async function DealerDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/dashboard/dealer");

  const [[profile], [{ activeCount }]] = await Promise.all([
    db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, user.id)),
    db
      .select({ activeCount: count() })
      .from(listings)
      .where(
        and(
          eq(listings.sellerId, user.id),
          eq(listings.status, "active"),
          or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
        ),
      ),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium leading-tight">Dealer profile</h1>
        <Link
          href={`/dealers/${user.id}`}
          className="text-[13px] font-semibold text-brand hover:text-brand-strong"
        >
          View public page →
        </Link>
      </div>

      <Card className="mb-5 p-4 text-sm text-muted">
        {activeCount} active listing{activeCount === 1 ? "" : "s"} shown on your public
        dealer page. This profile follows the same identity verification as private
        sellers — see the Overview tab to get verified.
      </Card>

      <DealerProfileForm profile={profile} />
    </div>
  );
}
