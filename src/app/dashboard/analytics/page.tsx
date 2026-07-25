import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { count, desc, eq, inArray } from "drizzle-orm";
import { db, favorites, inquiries, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { formatPkr } from "@/lib/format";

export const metadata: Metadata = { title: "Listing analytics" };

export default async function ListingAnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/dashboard/analytics");

  const myListings = await db
    .select()
    .from(listings)
    .where(eq(listings.sellerId, user.id))
    .orderBy(desc(listings.viewCount));
  const listingIds = myListings.map((l) => l.id);

  const [favoriteRows, inquiryRows] = await Promise.all([
    listingIds.length
      ? db
          .select({ listingId: favorites.listingId, total: count() })
          .from(favorites)
          .where(inArray(favorites.listingId, listingIds))
          .groupBy(favorites.listingId)
      : Promise.resolve([]),
    listingIds.length
      ? db
          .select({ listingId: inquiries.listingId, total: count() })
          .from(inquiries)
          .where(inArray(inquiries.listingId, listingIds))
          .groupBy(inquiries.listingId)
      : Promise.resolve([]),
  ]);
  const favoriteCount = new Map(favoriteRows.map((r) => [r.listingId, r.total]));
  const inquiryCount = new Map(inquiryRows.map((r) => [r.listingId, r.total]));

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10">
      <h1 className="mb-1.5 font-display text-2xl font-medium leading-tight">Listing analytics</h1>
      <p className="mb-6 text-sm text-muted">
        View counts are cumulative (all-time), not a rolling window — enough to see
        which listings are drawing interest.
      </p>

      {myListings.length === 0 ? (
        <Card className="p-6 text-sm text-muted">List a car to start seeing analytics here.</Card>
      ) : (
        <div className="space-y-3">
          {myListings.map((l) => (
            <Card key={l.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">
                  {l.make} {l.model} {l.year} — {formatPkr(l.askingPricePkr)}
                </p>
              </div>
              <div className="flex gap-5 text-center text-sm">
                <div>
                  <div className="font-display text-lg font-medium">{l.viewCount}</div>
                  <div className="text-[11px] text-muted">Views</div>
                </div>
                <div>
                  <div className="font-display text-lg font-medium">{favoriteCount.get(l.id) ?? 0}</div>
                  <div className="text-[11px] text-muted">Saved</div>
                </div>
                <div>
                  <div className="font-display text-lg font-medium">{inquiryCount.get(l.id) ?? 0}</div>
                  <div className="text-[11px] text-muted">Inquiries</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
