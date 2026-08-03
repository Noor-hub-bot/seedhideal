import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, avg, count, desc, eq, gt, isNull, or } from "drizzle-orm";
import {
  dealerProfiles,
  db,
  listings,
  reviews,
  users,
  verificationCases,
} from "@/db";
import { getSessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { Badge, Card, Heading } from "@/components/ui";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [row] = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, id));
  return { title: row?.businessName ?? "Dealer profile" };
}

export default async function DealerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [dealer] = await db.select().from(users).where(eq(users.id, id));
  if (!dealer) notFound();

  const [profile] = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, id));

  const activeCondition = and(
    eq(listings.sellerId, id),
    eq(listings.status, "active"),
    or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
  );

  const [inventory, [{ activeCount }], [{ avgRating, reviewCount }], [verified], viewer] =
    await Promise.all([
      db.select().from(listings).where(activeCondition).orderBy(desc(listings.approvedAt)),
      db.select({ activeCount: count() }).from(listings).where(activeCondition),
      db
        .select({ avgRating: avg(reviews.rating), reviewCount: count(reviews.id) })
        .from(reviews)
        .innerJoin(listings, eq(reviews.listingId, listings.id))
        .where(and(eq(listings.sellerId, id), eq(reviews.status, "approved"))),
      db
        .select({ id: verificationCases.id })
        .from(verificationCases)
        .where(and(eq(verificationCases.userId, id), eq(verificationCases.status, "verified"))),
      getSessionUser(),
    ]);

  // A "dealer" is anyone with a profile, or anyone who has ever listed as one —
  // this page works for both so it stays compatible with dealers created before
  // profiles existed (Phase 1's sellerType flag alone).
  const [everListedAsDealer] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.sellerId, id), eq(listings.sellerType, "dealer")))
    .limit(1);
  if (!profile && !everListedAsDealer) notFound();

  const approvedReviews = await db
    .select({ review: reviews })
    .from(reviews)
    .innerJoin(listings, eq(reviews.listingId, listings.id))
    .where(and(eq(listings.sellerId, id), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt))
    .limit(6);

  const { verifiedSellers, photosByListing, favoritedSet } = await enrichListings(inventory, viewer);

  const rating = avgRating ? Number(avgRating) : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {profile?.coverImageKey ? (
        <div className="relative mb-6 h-[220px] overflow-hidden rounded-card">
          <Image src={profile.coverImageKey} alt="" fill className="object-cover" />
        </div>
      ) : (
        <div className="photo-placeholder mb-6 h-[220px] rounded-card">dealer cover photo</div>
      )}

      <div className="flex flex-wrap items-start gap-5">
        {profile?.logoKey ? (
          <div className="relative -mt-16 h-24 w-24 shrink-0 overflow-hidden rounded-card border-4 border-background bg-surface">
            <Image src={profile.logoKey} alt="" fill className="object-cover" />
          </div>
        ) : (
          <div className="-mt-16 flex h-24 w-24 shrink-0 items-center justify-center rounded-card border-4 border-background bg-neutral-chip font-display text-3xl font-medium">
            {(profile?.businessName ?? dealer.displayName ?? "D").charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Heading size="md">{profile?.businessName ?? dealer.displayName ?? "Dealer"}</Heading>
            <Badge tone="neutral">Dealer</Badge>
            {verified && <Badge tone="gold">✓ Verified dealer</Badge>}
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {profile?.city ?? dealer.city ?? "Pakistan"} · {activeCount} active listing
            {activeCount === 1 ? "" : "s"}
            {reviewCount > 0 && (
              <>
                {" "}
                · {"★".repeat(Math.round(rating ?? 0))}
                {rating?.toFixed(1)} ({reviewCount} review{reviewCount === 1 ? "" : "s"})
              </>
            )}
          </p>
        </div>
      </div>

      {profile?.description && (
        <Card className="mt-6 p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{profile.description}</p>
        </Card>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Phone</dt>
              <dd className="font-medium">{profile?.contactPhone ?? "Not provided"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium">{profile?.contactEmail ?? "Not provided"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Address</dt>
              <dd className="font-medium">{profile?.address ?? "Not provided"}</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Working hours</h2>
          {profile?.workingHours && Object.keys(profile.workingHours).length > 0 ? (
            <dl className="space-y-2 text-sm">
              {Object.entries(profile.workingHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between gap-4">
                  <dt className="text-muted">{DAY_LABELS[day] ?? day}</dt>
                  <dd className="font-medium">{hours}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted">Not provided.</p>
          )}
        </Card>
      </div>

      <div className="mt-10">
        <Heading as="h2" size="md" className="mb-5">
          Inventory
        </Heading>
        {inventory.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">No active listings right now.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {inventory.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                sellerVerified={verifiedSellers.has(l.sellerId)}
                photos={photosByListing.get(l.id) ?? []}
                favorited={favoritedSet.has(l.id)}
                signedIn={!!viewer}
              />
            ))}
          </div>
        )}
      </div>

      {approvedReviews.length > 0 && (
        <div className="mt-10">
          <Heading as="h2" size="md" className="mb-5">
            Reviews
          </Heading>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {approvedReviews.map(({ review: r }) => (
              <Card key={r.id} className="p-5">
                <div className="mb-2 text-gold">
                  {"★".repeat(r.rating)}
                  <span className="text-neutral-chip">{"★".repeat(5 - r.rating)}</span>
                </div>
                <h3 className="mb-1.5 font-semibold">{r.title}</h3>
                <p className="text-sm leading-relaxed text-body-soft">{r.body}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
