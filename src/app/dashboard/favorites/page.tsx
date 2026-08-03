import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, favorites, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { Card, Heading } from "@/components/ui";

export const metadata: Metadata = { title: "Saved listings" };

export default async function FavoritesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/favorites");

  const saved = await db
    .select({ listing: listings })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .where(eq(favorites.userId, user.id))
    .orderBy(desc(favorites.createdAt));

  const savedListings = saved.map((s) => s.listing);
  const { verifiedSellers, photosByListing } = await enrichListings(savedListings, user);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Heading size="lg" className="mb-6">
        Saved listings
      </Heading>
      {savedListings.length === 0 ? (
        <Card className="p-16 text-center text-sm text-muted">
          You haven&apos;t saved any listings yet. Tap the heart icon on a listing to save it
          here.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {savedListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              sellerVerified={verifiedSellers.has(listing.sellerId)}
              photos={photosByListing.get(listing.id) ?? []}
              favorited
              signedIn
            />
          ))}
        </div>
      )}
    </div>
  );
}
