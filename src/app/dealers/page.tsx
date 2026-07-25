import type { Metadata } from "next";
import Link from "next/link";
import { and, avg, count, eq, inArray } from "drizzle-orm";
import { db, dealerProfiles, listings, reviews, users, verificationCases } from "@/db";
import { Badge, Card, Heading, Select } from "@/components/ui";
import { CITIES } from "@/lib/constants";

export const metadata: Metadata = { title: "Browse dealers" };

type Search = { city?: string; verified?: string };

export default async function DealersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;

  // Every seller who has ever listed as a dealer (Phase 1's per-listing flag),
  // whether or not they've since created a public profile — same "works for both"
  // compatibility as the dealer detail page.
  const dealerSellers = await db
    .selectDistinct({ sellerId: listings.sellerId })
    .from(listings)
    .where(eq(listings.sellerType, "dealer"));
  const dealerIds = dealerSellers.map((d) => d.sellerId);

  if (dealerIds.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Heading size="lg" className="mb-6">
          Browse dealers
        </Heading>
        <Card className="p-16 text-center text-sm text-muted">
          No dealers have listed inventory yet.
        </Card>
      </div>
    );
  }

  const [profiles, verifiedRows, activeCounts, ratingRows, dealerUsers] = await Promise.all([
    db.select().from(dealerProfiles).where(inArray(dealerProfiles.userId, dealerIds)),
    db
      .select({ userId: verificationCases.userId })
      .from(verificationCases)
      .where(and(inArray(verificationCases.userId, dealerIds), eq(verificationCases.status, "verified"))),
    db
      .select({ sellerId: listings.sellerId, total: count() })
      .from(listings)
      .where(and(inArray(listings.sellerId, dealerIds), eq(listings.status, "active")))
      .groupBy(listings.sellerId),
    db
      .select({ sellerId: listings.sellerId, avgRating: avg(reviews.rating), total: count(reviews.id) })
      .from(reviews)
      .innerJoin(listings, eq(reviews.listingId, listings.id))
      .where(and(inArray(listings.sellerId, dealerIds), eq(reviews.status, "approved")))
      .groupBy(listings.sellerId),
    db.select().from(users).where(inArray(users.id, dealerIds)),
  ]);

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
  const verifiedSet = new Set(verifiedRows.map((r) => r.userId));
  const activeCountBySeller = new Map(activeCounts.map((r) => [r.sellerId, r.total]));
  const ratingBySeller = new Map(ratingRows.map((r) => [r.sellerId, r]));

  let dealers = dealerUsers.map((u) => ({
    user: u,
    profile: profileByUser.get(u.id),
    verified: verifiedSet.has(u.id),
    activeCount: activeCountBySeller.get(u.id) ?? 0,
    rating: ratingBySeller.get(u.id),
  }));

  if (params.city && CITIES.includes(params.city)) {
    dealers = dealers.filter((d) => (d.profile?.city ?? d.user.city) === params.city);
  }
  if (params.verified === "1") {
    dealers = dealers.filter((d) => d.verified);
  }
  dealers.sort((a, b) => b.activeCount - a.activeCount);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Heading size="lg" className="mb-1.5">
        Browse dealers
      </Heading>
      <p className="mb-7 text-[15px] text-muted">
        {dealers.length} dealer{dealers.length === 1 ? "" : "s"} on SeedhiDeal
      </p>

      <form className="mb-8 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4">
        <Select name="city" defaultValue={params.city ?? ""} aria-label="City">
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="verified"
            value="1"
            defaultChecked={params.verified === "1"}
            className="h-4 w-4 rounded border-border-input accent-current text-brand"
          />
          Verified dealers only
        </label>
        <button
          type="submit"
          className="ml-auto rounded-control bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-strong"
        >
          Filter
        </button>
      </form>

      {dealers.length === 0 ? (
        <Card className="p-16 text-center text-sm text-muted">No dealers match those filters.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dealers.map((d) => (
            <Link key={d.user.id} href={`/dealers/${d.user.id}`}>
              <Card className="p-5 transition-shadow hover:shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-neutral-chip font-display text-lg font-medium">
                    {(d.profile?.businessName ?? d.user.displayName ?? "D").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {d.profile?.businessName ?? d.user.displayName ?? "Dealer"}
                    </p>
                    <p className="text-[13px] text-muted">{d.profile?.city ?? d.user.city ?? "Pakistan"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {d.verified && <Badge tone="gold">✓ Verified</Badge>}
                  <Badge tone="neutral">
                    {d.activeCount} listing{d.activeCount === 1 ? "" : "s"}
                  </Badge>
                  {d.rating && Number(d.rating.total) > 0 && (
                    <Badge tone="neutral">
                      ★ {Number(d.rating.avgRating).toFixed(1)} ({d.rating.total})
                    </Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
