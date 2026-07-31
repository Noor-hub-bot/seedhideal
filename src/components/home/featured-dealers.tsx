import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { and, count, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db, dealerProfiles, listings, users } from "@/db";
import { Card } from "@/components/ui";
import { SectionHeading } from "./section-heading";
import { safeSection } from "@/lib/safe-section";

// Not personalized — safe to cache for 60s, same rationale as BrandGrid.
const getFeaturedDealers = unstable_cache(
  async () =>
    db
      .select({
        sellerId: listings.sellerId,
        displayName: users.displayName,
        city: users.city,
        businessName: dealerProfiles.businessName,
        logoKey: dealerProfiles.logoKey,
        total: count(),
      })
      .from(listings)
      .innerJoin(users, eq(listings.sellerId, users.id))
      .leftJoin(dealerProfiles, eq(dealerProfiles.userId, listings.sellerId))
      .where(
        and(
          eq(listings.status, "active"),
          eq(listings.sellerType, "dealer"),
          or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
        ),
      )
      .groupBy(
        listings.sellerId,
        users.displayName,
        users.city,
        dealerProfiles.businessName,
        dealerProfiles.logoKey,
      )
      .orderBy(desc(count()))
      .limit(6),
  ["home-featured-dealers"],
  { revalidate: 60 },
);

// Dealer data is limited today (no dealer onboarding funnel), but this now
// links to real /dealers/[id] pages — profile info shown when a dealer has
// set one up, plain listing count otherwise. Renders nothing when there are
// no dealer listings.
export async function FeaturedDealers() {
  const rows = await safeSection(getFeaturedDealers, []);

  if (rows.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading title="Featured dealers" seeAllHref="/dealers" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {rows.map((d) => (
          <Link key={d.sellerId} href={`/dealers/${d.sellerId}`}>
            <Card className="flex flex-col items-center gap-1.5 px-4 py-6 text-center transition-shadow hover:shadow-sm">
              {d.logoKey ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  <Image src={d.logoKey} alt="" fill sizes="40px" className="object-cover" />
                </div>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-chip font-display text-lg font-medium">
                  {(d.businessName ?? d.displayName ?? "D").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm font-semibold">
                {d.businessName ?? d.displayName ?? "Dealer"}
              </span>
              <span className="text-[12px] text-muted">
                {d.city ?? "Pakistan"} · {d.total} listing{d.total === 1 ? "" : "s"}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
