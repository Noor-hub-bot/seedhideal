import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, featuredPlans, listingBoosts, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { getBlockingListing } from "@/lib/actions/marketplace";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { BoostStatus, ListingActions } from "@/components/dashboard/listing-actions";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/dashboard-labels";
import { formatDate, formatPkr } from "@/lib/format";

export const metadata: Metadata = { title: "My listings" };

export default async function MyListingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/listings");

  const myListings = await db
    .select()
    .from(listings)
    .where(eq(listings.sellerId, user.id))
    .orderBy(desc(listings.createdAt));
  const listingIds = myListings.map((l) => l.id);

  const [activePlans, myBoosts, blockingListing] = await Promise.all([
    db.select().from(featuredPlans).where(eq(featuredPlans.active, true)),
    listingIds.length
      ? db
          .select()
          .from(listingBoosts)
          .where(inArray(listingBoosts.listingId, listingIds))
          .orderBy(desc(listingBoosts.createdAt))
      : Promise.resolve([]),
    getBlockingListing(user.id),
  ]);

  const boostByListing = new Map<string, (typeof myBoosts)[number]>();
  for (const b of myBoosts) {
    const existing = boostByListing.get(b.listingId);
    if (!existing || ((b.status === "pending" || b.status === "active") && existing.status !== "active")) {
      boostByListing.set(b.listingId, b);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium leading-tight">My listings</h1>
        {!blockingListing && <ButtonLink href="/sell">Sell your car</ButtonLink>}
      </div>

      {myListings.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          You have no listings yet. Private owners get one free listing — verified,
          protected and with no surprise charges.
        </Card>
      ) : (
        <div className="space-y-3">
          {myListings.map((l) => (
            <Card key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {l.make} {l.model} {l.year} — {formatPkr(l.askingPricePkr)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Submitted {formatDate(l.createdAt)}
                  {l.expiresAt && l.status === "active" ? ` · expires ${formatDate(l.expiresAt)}` : ""}
                </p>
                {l.status === "correction" && l.rejectionReason && (
                  <p className="mt-1 rounded-input bg-alert-soft px-2 py-1 text-xs text-alert-ink">
                    Correction needed: {l.rejectionReason}
                  </p>
                )}
                <div className="mt-2">
                  <BoostStatus listing={l} boost={boostByListing.get(l.id)} plans={activePlans} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[l.status] ?? "neutral"}>{STATUS_LABEL[l.status] ?? l.status}</Badge>
                <ListingActions status={l.status} listingId={l.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
