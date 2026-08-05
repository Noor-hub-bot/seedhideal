import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, featuredPlans, listingBoosts, listings } from "@/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getBlockingListing } from "@/lib/actions/marketplace";
import { enrichListings } from "@/lib/listing-enrichment";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { ListingCard } from "@/components/listing-card";
import { BoostStatus, ListingActions } from "@/components/dashboard/listing-actions";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/dashboard-labels";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "My listings" };

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/listings");
  const { deleted } = await searchParams;

  const myListings = await db
    .select()
    .from(listings)
    .where(eq(listings.sellerId, user.id))
    .orderBy(desc(listings.createdAt));
  const listingIds = myListings.map((l) => l.id);

  const [activePlans, myBoosts, blockingListing, { verifiedSellers, photosByListing }] = await Promise.all([
    db.select().from(featuredPlans).where(eq(featuredPlans.active, true)),
    listingIds.length
      ? db
          .select()
          .from(listingBoosts)
          .where(inArray(listingBoosts.listingId, listingIds))
          .orderBy(desc(listingBoosts.createdAt))
      : Promise.resolve([]),
    // Staff bypass the one-active-listing restriction (see src/app/sell/page.tsx) — the
    // "Sell your car" button below must stay visible for them too.
    isStaff(user) ? Promise.resolve(null) : getBlockingListing(user.id),
    // Same batched seller-verified/photos lookup every other ListingCard consumer uses —
    // here every row shares one seller (the viewer), but reusing it avoids a second copy
    // of that join logic just for this page.
    enrichListings(myListings, user),
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

      {deleted === "1" && (
        <p role="status" className="mb-4 rounded-input bg-brand-soft px-3 py-2 text-sm text-brand-soft-ink">
          Listing permanently deleted.
        </p>
      )}

      {myListings.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          You have no listings yet. Private owners get one free listing — verified,
          protected and with no surprise charges.
        </Card>
      ) : (
        <div className="space-y-4">
          {myListings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              layout="list"
              sellerVerified={verifiedSellers.has(l.sellerId)}
              photos={photosByListing.get(l.id) ?? []}
              showOverlayActions={false}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATUS_TONE[l.status] ?? "neutral"}>{STATUS_LABEL[l.status] ?? l.status}</Badge>
                      <span className="text-xs text-muted">
                        Submitted {formatDate(l.createdAt)}
                        {l.expiresAt && l.status === "active" ? ` · expires ${formatDate(l.expiresAt)}` : ""}
                      </span>
                    </div>
                    {l.status === "correction" && l.rejectionReason && (
                      <p className="mt-1.5 rounded-input bg-alert-soft px-2 py-1 text-xs text-alert-ink">
                        Correction needed: {l.rejectionReason}
                      </p>
                    )}
                    <div className="mt-1.5">
                      <BoostStatus listing={l} boost={boostByListing.get(l.id)} plans={activePlans} />
                    </div>
                  </div>
                  <ListingActions status={l.status} listingId={l.id} />
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
