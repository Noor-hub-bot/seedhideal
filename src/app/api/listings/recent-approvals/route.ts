// Public, unauthenticated poll endpoint backing the site-wide "New Car Added" toast
// (src/components/new-listing-notifications.tsx). No WebSocket/SSE/pubsub service is
// configured anywhere in this project (no Pusher/Ably/Redis/etc. in package.json), so
// genuinely instant cross-client push isn't available without adding a new third-party
// dependency — this is the pragmatic, dependency-free alternative: every visitor's
// browser polls this on an interval and gets back whatever went live since their last
// check. Reuses `listings.approvedAt` (already set the moment a listing is approved,
// see approveListingAsStaff) as the "became active" signal — no new column needed, and
// it naturally excludes anything still under review, since approvedAt is only ever set
// at approval time.
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db, listingPhotos, listings } from "@/db";

const MAX_RESULTS = 5;

export async function GET(req: NextRequest) {
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  if (!since || Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid or missing 'since' timestamp." }, { status: 400 });
  }

  const rows = await db
    .select({
      id: listings.id,
      make: listings.make,
      model: listings.model,
      variant: listings.variant,
      year: listings.year,
      askingPricePkr: listings.askingPricePkr,
      city: listings.city,
      approvedAt: listings.approvedAt,
    })
    .from(listings)
    .where(and(eq(listings.status, "active"), gt(listings.approvedAt, since)))
    .orderBy(asc(listings.approvedAt))
    .limit(MAX_RESULTS);

  const photoByListing = new Map<string, string>();
  if (rows.length > 0) {
    const photoRows = await db
      .select({ listingId: listingPhotos.listingId, storageKey: listingPhotos.storageKey })
      .from(listingPhotos)
      .where(inArray(listingPhotos.listingId, rows.map((r) => r.id)))
      .orderBy(asc(listingPhotos.sortOrder));
    for (const p of photoRows) if (!photoByListing.has(p.listingId)) photoByListing.set(p.listingId, p.storageKey);
  }

  return NextResponse.json({
    listings: rows.map((r) => ({
      id: r.id,
      make: r.make,
      model: r.model,
      variant: r.variant,
      year: r.year,
      askingPricePkr: r.askingPricePkr,
      city: r.city,
      approvedAt: r.approvedAt!.toISOString(),
      photo: photoByListing.get(r.id) ?? null,
    })),
  });
}
