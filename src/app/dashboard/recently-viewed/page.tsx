import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, listings, recentlyViewed } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { Card, Heading } from "@/components/ui";

export const metadata: Metadata = { title: "Recently viewed" };

export default async function RecentlyViewedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/recently-viewed");

  const rows = await db
    .select()
    .from(recentlyViewed)
    .where(eq(recentlyViewed.userId, user.id))
    .orderBy(desc(recentlyViewed.viewedAt))
    .limit(24);

  const listingIds = rows.map((r) => r.listingId);
  const viewedListings = listingIds.length
    ? await db.select().from(listings).where(inArray(listings.id, listingIds))
    : [];
  // Preserve viewedAt order, not the arbitrary DB return order.
  const listingById = new Map(viewedListings.map((l) => [l.id, l]));
  const ordered = listingIds.map((id) => listingById.get(id)).filter((l) => !!l);

  const { verifiedSellers, photosByListing, favoritedSet } = await enrichListings(ordered, user);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <Heading size="md" className="mb-6">
        Recently viewed
      </Heading>
      {ordered.length === 0 ? (
        <Card className="p-16 text-center text-sm text-muted">
          Cars you view will show up here.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              sellerVerified={verifiedSellers.has(l.sellerId)}
              photos={photosByListing.get(l.id) ?? []}
              favorited={favoritedSet.has(l.id)}
              signedIn
            />
          ))}
        </div>
      )}
    </div>
  );
}
