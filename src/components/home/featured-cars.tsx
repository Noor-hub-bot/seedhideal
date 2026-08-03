import { unstable_cache } from "next/cache";
import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db, listingBoosts, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { SectionHeading } from "./section-heading";
import { CarRail, CarRailItem } from "./car-rail";
import { safeSection } from "@/lib/safe-section";

// Only the listing rows are cached — `getSessionUser()` and `enrichListings`'s
// favorites lookup below stay fully dynamic (per-viewer), so personalization
// (favorited state, signed-in state) is unaffected by this cache.
const getFeaturedListings = unstable_cache(
  async () =>
    db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.status, "active"),
          eq(listings.featured, true),
          or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
        ),
      )
      .orderBy(desc(listings.featuredPriority), desc(listings.approvedAt))
      .limit(12),
  ["home-featured-cars"],
  { revalidate: 60 },
);

// Sellers request a boost from /dashboard, staff approve it from /admin — this
// section is real and wired, it simply renders nothing until at least one
// listing has an admin-approved active boost.
export async function FeaturedCars() {
  const data = await safeSection(async () => {
    const [results, viewer] = await Promise.all([getFeaturedListings(), getSessionUser()]);
    if (results.length === 0) return null;
    const enriched = await enrichListings(results, viewer);
    return { results, viewer, ...enriched };
  }, null);

  if (!data) return null;
  const { results, viewer, verifiedSellers, photosByListing, favoritedSet } = data;

  // Featured Analytics — best-effort impression count for the shown listings'
  // active boosts. Never blocks or breaks the section if it fails.
  try {
    await db
      .update(listingBoosts)
      .set({ impressionCount: sql`${listingBoosts.impressionCount} + 1` })
      .where(
        and(
          inArray(listingBoosts.listingId, results.map((l) => l.id)),
          eq(listingBoosts.status, "active"),
        ),
      );
  } catch {
    // best-effort only
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading title="Featured cars" seeAllHref="/cars?featured=1" />
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
