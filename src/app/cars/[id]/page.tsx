import { notFound } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  db,
  favorites,
  listingBoosts,
  listingPhotos,
  listings,
  recentlyViewed,
  users,
  verificationCases,
} from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Badge, Card, Heading, SafetyNotice } from "@/components/ui";
import { CheckIcon } from "@/components/home/icons";
import { formatDate, formatKm, formatPkr } from "@/lib/format";
import { ReportForm } from "@/components/report-form";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareListing } from "@/components/share-listing";
import { SimilarCars } from "@/components/similar-cars";
import { PhotoGallery } from "@/components/photo-gallery";
import { InquiryForm } from "./inquiry-form";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [row] = await db
    .select({ listing: listings, seller: users })
    .from(listings)
    .innerJoin(users, eq(listings.sellerId, users.id))
    .where(eq(listings.id, id));
  // "sold" is allowed (read-only) so links from Recently Sold, favorite-sold
  // notifications, and old bookmarks don't 404 once a car sells.
  if (!row || !["active", "sold"].includes(row.listing.status)) notFound();
  // Excludes active listings past expiresAt even if the cron sweep hasn't
  // flipped their status yet (sold listings have no meaningful expiry check).
  if (
    row.listing.status === "active" &&
    row.listing.expiresAt &&
    row.listing.expiresAt <= new Date()
  )
    notFound();
  const { listing, seller } = row;

  // Featured Analytics — best-effort click count for the active boost, if any.
  // Never blocks or breaks the page if it fails.
  if (listing.featured) {
    try {
      await db
        .update(listingBoosts)
        .set({ clickCount: sql`${listingBoosts.clickCount} + 1` })
        .where(and(eq(listingBoosts.listingId, listing.id), eq(listingBoosts.status, "active")));
    } catch {
      // best-effort only
    }
  }

  const [verified] = await db
    .select({ id: verificationCases.id })
    .from(verificationCases)
    .where(
      and(
        eq(verificationCases.userId, seller.id),
        eq(verificationCases.status, "verified"),
      ),
    );

  const photos = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listing.id))
    .orderBy(asc(listingPhotos.sortOrder));

  // Cumulative view counter (Trending Cars, Listing Analytics) — best-effort,
  // never blocks or breaks the page if it fails.
  try {
    await db
      .update(listings)
      .set({ viewCount: sql`${listings.viewCount} + 1` })
      .where(eq(listings.id, listing.id));
  } catch {
    // best-effort only
  }

  const viewer = await getSessionUser();

  // Recently Viewed — only for a genuine buyer view, not the seller checking
  // their own listing. Upserted so this is "last viewed at", not a full log.
  if (viewer && viewer.id !== seller.id) {
    try {
      await db
        .insert(recentlyViewed)
        .values({ userId: viewer.id, listingId: listing.id })
        .onConflictDoUpdate({
          target: [recentlyViewed.userId, recentlyViewed.listingId],
          set: { viewedAt: new Date() },
        });
    } catch {
      // best-effort only
    }
  }

  const [favorited] = viewer
    ? await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, viewer.id), eq(favorites.listingId, listing.id)))
    : [];
  const d = listing.disclosures ?? {};
  const disclosureRows: [string, string | undefined][] = [
    ["Painted panels", d.paintedPanels],
    ["Accident history", d.accidentHistory],
    ["Known mechanical issues", d.mechanicalIssues],
    ["Documents", d.documents],
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PhotoGallery
        photos={photos.map((p) => p.storageKey)}
        alt={`${listing.make} ${listing.model}`}
        aspectClassName="aspect-video"
        objectFit="contain"
        whiteBackground
        showArrows="always"
        showDots
        showCounter
        showThumbnails
        enableKeyboard
        enableZoom
        priority
        imageSizes="(min-width: 1024px) 896px, 100vw"
      />

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        {listing.featured && <Badge tone="brand">★ Featured</Badge>}
        {/* Seller type above the contact action, always (DET-01) */}
        <Badge tone="neutral">
          {listing.sellerType === "dealer" ? "Dealer" : "Private owner"}
        </Badge>
        {verified ? (
          <>
            <Badge tone="verified">✓ Verified owner</Badge>
            {/* Gold marks ownership evidence only — per design system rule */}
            <Badge tone="gold">✓ Ownership confirmed</Badge>
          </>
        ) : (
          <Badge tone="review">Under review</Badge>
        )}
        <span className="text-[13px] text-muted">
          Listed {formatDate(listing.createdAt)}
        </span>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <Heading size="md">
          {listing.make} {listing.model}
          {listing.variant ? ` ${listing.variant}` : ""}, {listing.year}
        </Heading>
        <div className="flex items-center gap-2">
          <ShareListing title={`${listing.make} ${listing.model} ${listing.year}`} />
          <FavoriteButton
            listingId={listing.id}
            favorited={!!favorited}
            signedIn={!!viewer}
            nextHref={`/cars/${listing.id}`}
          />
        </div>
      </div>
      <p className="mt-2 font-display text-[28px] font-medium">
        {formatPkr(listing.askingPricePkr)}
      </p>
      <p className="mt-1 text-sm text-muted">
        Market price guidance appears here once enough closed-sale data is
        available — no single &ldquo;correct price&rdquo; is claimed.
      </p>

      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Vehicle details</h2>
          <dl className="space-y-2.5 text-sm">
            {(
              [
                ["City", listing.city],
                ["Registration", listing.registrationCity ?? "Not provided"],
                ["Mileage", formatKm(listing.mileageKm)],
                [
                  "Transmission",
                  listing.transmission === "automatic" ? "Automatic" : "Manual",
                ],
                ["Fuel", listing.fuel],
                ["Engine size", listing.engineCc ? `${listing.engineCc}cc` : "Not provided"],
                ["Owners", listing.ownershipCount?.toString() ?? "Not provided"],
                ["Body type", listing.bodyType ?? "Not provided"],
                [
                  "Assembly",
                  listing.assembly
                    ? listing.assembly === "imported"
                      ? "Imported"
                      : "Local"
                    : "Not provided",
                ],
                ["Exterior color", listing.exteriorColor ?? "Not provided"],
                ["Interior color", listing.interiorColor ?? "Not provided"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium capitalize">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          {/* Structured condition disclosure incl. "not provided" states (DET-04) */}
          <h2 className="mb-3 font-semibold">Condition disclosure</h2>
          <dl className="space-y-2.5 text-sm">
            {disclosureRows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className={v ? "font-medium" : "font-medium text-alert-ink"}>
                  {v || "Not provided"}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="mt-7 space-y-4">
        {listing.status === "sold" ? (
          <Card className="p-5 text-center">
            <p className="font-semibold">This car has been sold.</p>
            <p className="mt-1 text-sm text-muted">
              It&apos;s kept here for reference — inquiries are closed.
            </p>
          </Card>
        ) : (
          <SafetyNotice />
        )}
        {/* Phone number is never shown — protected inquiry only (INQ-03) */}
        {viewer?.id === seller.id ? (
          <p className="text-sm text-muted">This is your listing.</p>
        ) : (
          <>
            {listing.status === "active" && (
              <InquiryForm listingId={listing.id} signedIn={!!viewer} />
            )}
            <div className="text-center">
              <ReportForm
                listingId={listing.id}
                reportedUserId={seller.id}
                signedIn={!!viewer}
                label="Report this listing"
              />
            </div>
          </>
        )}
      </div>

      <section className="mt-12">
        <Heading as="h2" size="md" className="mb-4">
          Car Overview
        </Heading>
        {listing.description ? (
          <Card className="p-6">
            <p className="whitespace-pre-wrap text-[15px] leading-[1.8] text-body-soft">{listing.description}</p>
          </Card>
        ) : (
          <Card className="p-6 text-center text-sm text-muted">
            The seller hasn&apos;t added an overview for this car yet.
          </Card>
        )}
      </section>

      <section className="mt-10">
        <Heading as="h2" size="md" className="mb-4">
          Features &amp; Highlights
        </Heading>
        {listing.features && listing.features.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listing.features.map((f) => (
              <div
                key={f}
                className="group flex items-center gap-2.5 rounded-card border border-border bg-surface p-3.5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-ink transition-colors group-hover:bg-brand group-hover:text-white">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[13px] font-medium">{f}</span>
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center text-sm text-muted">
            No specific features have been listed for this car yet.
          </Card>
        )}
      </section>

      <SimilarCars current={listing} viewer={viewer} />
    </div>
  );
}
