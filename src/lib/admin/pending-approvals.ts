import { asc, eq, inArray } from "drizzle-orm";
import { db, listingPhotos, listings, users } from "@/db";

export type PendingApproval = {
  id: string;
  title: string;
  sellerName: string;
  city: string;
  price: number;
  createdAt: Date;
  photoUrl: string | null;
};

/**
 * A preview of the same moderation queue src/app/admin/moderation/page.tsx shows in
 * full (status in submitted/under_review/correction, oldest first) — same condition
 * and join, just capped to `limit` and with a cover photo attached for the dashboard's
 * compact row layout.
 */
export async function getPendingApprovals(limit = 6): Promise<PendingApproval[]> {
  const rows = await db
    .select({ listing: listings, sellerName: users.displayName, sellerPhone: users.phone })
    .from(listings)
    .innerJoin(users, eq(listings.sellerId, users.id))
    .where(inArray(listings.status, ["submitted", "under_review", "correction"]))
    .orderBy(asc(listings.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];
  const listingIds = rows.map((r) => r.listing.id);
  const photoRows = await db
    .select({ listingId: listingPhotos.listingId, storageKey: listingPhotos.storageKey })
    .from(listingPhotos)
    .where(inArray(listingPhotos.listingId, listingIds))
    .orderBy(asc(listingPhotos.sortOrder));
  const photoByListing = new Map<string, string>();
  for (const p of photoRows) if (!photoByListing.has(p.listingId)) photoByListing.set(p.listingId, p.storageKey);

  return rows.map((r) => ({
    id: r.listing.id,
    title: `${r.listing.make} ${r.listing.model}${r.listing.variant ? ` ${r.listing.variant}` : ""}, ${r.listing.year}`,
    sellerName: r.sellerName ?? r.sellerPhone ?? "Unknown seller",
    city: r.listing.city,
    price: r.listing.askingPricePkr,
    createdAt: r.listing.createdAt,
    photoUrl: photoByListing.get(r.listing.id) ?? null,
  }));
}
