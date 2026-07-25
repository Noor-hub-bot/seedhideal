import { and, asc, eq, inArray } from "drizzle-orm";
import { db, favorites, listingPhotos, listings, verificationCases } from "@/db";
import type { SessionUser } from "@/lib/auth";

type Listing = typeof listings.$inferSelect;

/**
 * Resolves the per-card data a ListingCard needs (seller verified?, cover
 * photo, favorited?) for a batch of listings — shared by /cars and every
 * homepage rail section so this join logic exists in exactly one place.
 */
export async function enrichListings(results: Listing[], viewer: SessionUser | null) {
  const sellerIds = [...new Set(results.map((l) => l.sellerId))];
  const listingIds = results.map((l) => l.id);

  const [verifiedRows, photoRows, favoritedRows] = await Promise.all([
    sellerIds.length
      ? db
          .select({ userId: verificationCases.userId })
          .from(verificationCases)
          .where(
            and(
              inArray(verificationCases.userId, sellerIds),
              eq(verificationCases.status, "verified"),
            ),
          )
      : Promise.resolve([]),
    listingIds.length
      ? db
          .select({ listingId: listingPhotos.listingId, storageKey: listingPhotos.storageKey })
          .from(listingPhotos)
          .where(inArray(listingPhotos.listingId, listingIds))
          .orderBy(asc(listingPhotos.sortOrder))
      : Promise.resolve([]),
    viewer && listingIds.length
      ? db
          .select({ listingId: favorites.listingId })
          .from(favorites)
          .where(and(eq(favorites.userId, viewer.id), inArray(favorites.listingId, listingIds)))
      : Promise.resolve([]),
  ]);

  const verifiedSellers = new Set(verifiedRows.map((r) => r.userId));
  const photoByListing = new Map<string, string>();
  for (const p of photoRows) {
    if (!photoByListing.has(p.listingId)) photoByListing.set(p.listingId, p.storageKey);
  }
  const favoritedSet = new Set(favoritedRows.map((f) => f.listingId));

  return { verifiedSellers, photoByListing, favoritedSet };
}
