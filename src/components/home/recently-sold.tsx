import { unstable_cache } from "next/cache";
import { desc, eq } from "drizzle-orm";
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
const getRecentlySoldListings = unstable_cache(
  async () =>
    db
      .select()
      .from(listings)
      .where(eq(listings.status, "sold"))
      .orderBy(desc(listings.soldAt))
      .limit(12),
  ["home-recently-sold"],
  { revalidate: 60 },
);

// Real closed sales — status is already tracked (`markListingSoldAction`),
// no schema needed. Detail links stay valid: /cars/[id] treats "sold" as a
// read-only state rather than 404ing.
export async function RecentlySold() {
  const data = await safeSection(async () => {
    const [results, viewer] = await Promise.all([getRecentlySoldListings(), getSessionUser()]);
    if (results.length === 0) return null;
    const enriched = await enrichListings(results, viewer);
    return { results, viewer, ...enriched };
  }, null);

  if (!data) return null;
  const { results, viewer, verifiedSellers, photosByListing, favoritedSet } = data;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading title="Recently sold" subtitle="Real closed sales on SeedhiDeal" />
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
