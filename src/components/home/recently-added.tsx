import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { SectionHeading } from "./section-heading";
import { CarRail, CarRailItem } from "./car-rail";
import { safeSection } from "@/lib/safe-section";

export async function RecentlyAdded() {
  const data = await safeSection(async () => {
    const [results, viewer] = await Promise.all([
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
      <SectionHeading title="Recently added cars" seeAllHref="/cars" />
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
