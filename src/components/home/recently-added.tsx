import { unstable_cache } from "next/cache";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { SectionHeading } from "./section-heading";
import { CarRail, CarRailItem } from "./car-rail";
import { safeSection } from "@/lib/safe-section";

// Only the listing rows are cached — `getSessionUser()` and `enrichListings`'s
// favorites lookup below stay fully dynamic (per-viewer), so personalization
// (favorited state, signed-in state) is unaffected by this cache.
const getRecentlyAddedListings = unstable_cache(
  async () =>
    db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.status, "active"),
          or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
        ),
      )
      .orderBy(desc(listings.approvedAt))
      .limit(12),
  ["home-recently-added"],
  { revalidate: 60 },
);

export async function RecentlyAdded() {
  const data = await safeSection(async () => {
    const [results, viewer] = await Promise.all([getRecentlyAddedListings(), getSessionUser()]);
    if (results.length === 0) return null;
    const enriched = await enrichListings(results, viewer);
    return { results, viewer, ...enriched };
  }, null);

  if (!data) return null;
  const { results, viewer, verifiedSellers, photosByListing, favoritedSet } = data;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading title="Recently added cars" seeAllHref="/cars" />
      <CarRail>
        {results.map((l) => (
          <CarRailItem key={l.id}>
            <ListingCard
              listing={l}
              sellerVerified={verifiedSellers.has(l.sellerId)}
              photos={photosByListing.get(l.id) ?? []}
              favorited={favoritedSet.has(l.id)}
              signedIn={!!viewer}
            />
          </CarRailItem>
        ))}
      </CarRail>
    </section>
  );
}
