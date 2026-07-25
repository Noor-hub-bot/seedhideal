import { and, desc, eq, gt, gte, isNull, or } from "drizzle-orm";
import { db, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { SectionHeading } from "./section-heading";
import { CarRail, CarRailItem } from "./car-rail";
import { PREMIUM_PRICE_THRESHOLD_PKR } from "@/lib/constants";
import { safeSection } from "@/lib/safe-section";

// Merges the requested "Premium Cars" and "Luxury Cars" sections into one:
// current makes (Toyota/Honda/Suzuki/Hyundai/Kia/Daihatsu) include no luxury
// brands, so a brand-based "Luxury" section would almost always be empty.
// This uses a real price threshold instead, hidden gracefully when nothing
// qualifies.
export async function PremiumPicks() {
  const data = await safeSection(async () => {
    const [results, viewer] = await Promise.all([
      db
        .select()
        .from(listings)
        .where(
          and(
            eq(listings.status, "active"),
            gte(listings.askingPricePkr, PREMIUM_PRICE_THRESHOLD_PKR),
            or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
          ),
        )
        .orderBy(desc(listings.askingPricePkr))
        .limit(12),
      getSessionUser(),
    ]);
    if (results.length === 0) return null;
    const enriched = await enrichListings(results, viewer);
    return { results, viewer, ...enriched };
  }, null);

  if (!data) return null;
  const { results, viewer, verifiedSellers, photoByListing, favoritedSet } = data;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading title="Premium picks" subtitle="Our highest-value verified listings" seeAllHref="/cars" />
      <CarRail>
        {results.map((l) => (
          <CarRailItem key={l.id}>
            <ListingCard
              listing={l}
              sellerVerified={verifiedSellers.has(l.sellerId)}
              photoUrl={photoByListing.get(l.id)}
              favorited={favoritedSet.has(l.id)}
              signedIn={!!viewer}
            />
          </CarRailItem>
        ))}
      </CarRail>
    </section>
  );
}
