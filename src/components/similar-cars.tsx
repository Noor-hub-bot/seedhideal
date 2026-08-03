import { and, desc, eq, gt, gte, isNull, ne, or, lte } from "drizzle-orm";
import { db, listings } from "@/db";
import type { SessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { SectionHeading } from "@/components/home/section-heading";
import { CarRail, CarRailItem } from "@/components/home/car-rail";

type Listing = typeof listings.$inferSelect;

// Merges what would otherwise be two near-identical "Similar" and
// "Recommended" rails — same criteria (make or body type, ±30% price),
// no real personalization engine exists to meaningfully tell them apart.
export async function SimilarCars({ current, viewer }: { current: Listing; viewer: SessionUser | null }) {
  const minPrice = Math.round(current.askingPricePkr * 0.7);
  const maxPrice = Math.round(current.askingPricePkr * 1.3);

  const sameBodyType = current.bodyType
    ? eq(listings.bodyType, current.bodyType)
    : undefined;
  const matchCondition = sameBodyType
    ? or(sameBodyType, eq(listings.make, current.make))!
    : eq(listings.make, current.make);

  const results = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.status, "active"),
        ne(listings.id, current.id),
        matchCondition,
        gte(listings.askingPricePkr, minPrice),
        lte(listings.askingPricePkr, maxPrice),
        or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
      ),
    )
    .orderBy(desc(listings.featured), desc(listings.approvedAt))
    .limit(8);

  if (results.length === 0) return null;

  const { verifiedSellers, photosByListing, favoritedSet } = await enrichListings(results, viewer);

  return (
    <div className="mt-10">
      <SectionHeading title="Similar cars" />
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
    </div>
  );
}
