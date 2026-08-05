import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatKm, formatPkr } from "@/lib/format";
import { FavoriteButton } from "@/components/favorite-button";
import { CompareCheckbox } from "@/components/compare-checkbox";
import { CheckIcon, StarIcon } from "@/components/home/icons";
import { PhotoGallery } from "@/components/photo-gallery";
import type { listings } from "@/db";

type Listing = typeof listings.$inferSelect;

// The ONE listing card used everywhere across the marketplace (homepage rails, /cars
// browse + search, dealer/related/favorites/recently-viewed grids, and the dashboard's
// own listings list via the `footer` slot below) — every card gets an identical width,
// height, image size, and content position regardless of title length or which section
// renders it, which is the whole point: fix it here once, every page inherits it.
//
// How height stays uniform:
// - The card is a full-height flex column (`h-full flex flex-col`); its parent grid/rail
//   already stretches every card in a row to the same height (CSS Grid's default
//   `align-items: stretch`, and a flex row's default stretch for CarRail), so this only
//   needs to fill whatever height that gives it.
// - The photo is a fixed aspect ratio (grid) or fixed width with self-stretch (list) —
//   never content-sized.
// - The content block is `flex-1 flex flex-col`, with the title clamped to exactly 2
//   lines via `line-clamp-2 min-h-[3rem]` (the min-height reserves that 2-line space
//   even for a 1-line title, so shorter titles don't shrink the row either), the meta
//   line clamped to 1 line, and the price/footer group pinned to the bottom via
//   `mt-auto` — so every card's badges/title/meta start at the same Y position and every
//   card's price sits at the same Y position from the bottom, no matter what's in between.
export function ListingCard({
  listing,
  sellerVerified,
  photos = [],
  favorited = false,
  signedIn = false,
  layout = "grid",
  footer,
  showOverlayActions = true,
}: {
  listing: Listing;
  sellerVerified: boolean;
  photos?: string[];
  favorited?: boolean;
  signedIn?: boolean;
  layout?: "grid" | "list";
  /** Page-specific extras rendered below the price, inside the card but OUTSIDE the
   * clickable Link (so buttons in here — e.g. the dashboard's Edit/Delete/Pause — don't
   * also trigger card navigation). Nothing renders here unless a caller passes it, so
   * every other consumer's card looks identical to before. */
  footer?: ReactNode;
  /** Hides the Favorite/Compare overlay buttons — for the dashboard's "My listings",
   * where favoriting or comparing your own car makes no sense. On everywhere else this
   * stays true (the previous, only behavior). */
  showOverlayActions?: boolean;
}) {
  const title = `${listing.make} ${listing.model}${listing.variant ? ` ${listing.variant}` : ""}, ${listing.year}`;
  const meta = `${listing.city} · ${formatKm(listing.mileageKm)} · ${listing.transmission === "automatic" ? "Automatic" : "Manual"}`;
  const href = `/cars/${listing.id}`;

  const badges = (
    <div className="mb-2 flex h-[22px] items-center gap-1.5 overflow-hidden">
      {listing.featured && (
        <Badge tone="brand" className="shrink-0 whitespace-nowrap px-2 py-1 text-[11px]">
          <StarIcon className="h-3 w-3 shrink-0" /> Featured
        </Badge>
      )}
      {listing.sellerType === "dealer" && (
        <Badge tone="neutral" className="shrink-0 whitespace-nowrap px-2 py-1 text-[11px]">
          Dealer
        </Badge>
      )}
      <VerifiedPill verified={sellerVerified} />
    </div>
  );

  if (layout === "list") {
    return (
      <div className="group relative h-full">
        <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-sm">
          <Link href={href} className="flex flex-1">
            <ListingPhoto photos={photos} alt={title} className="w-[180px] flex-shrink-0 self-stretch sm:w-[220px]" />
            <div className="flex min-w-0 flex-1 flex-col justify-center px-6 py-5">
              {badges}
              <h3 className="line-clamp-2 min-h-[2.75rem] text-lg font-semibold leading-snug">{title}</h3>
              <p className="mt-2 line-clamp-1 text-[13px] text-muted">{meta}</p>
              <div className="mt-auto pt-3">
                <p className="font-display text-[21px] font-medium">{formatPkr(listing.askingPricePkr)}</p>
              </div>
            </div>
          </Link>
          {footer && <div className="shrink-0 border-t border-border px-6 py-4">{footer}</div>}
        </Card>
        {showOverlayActions && (
          <>
            <FavoriteButton
              listingId={listing.id}
              favorited={favorited}
              signedIn={signedIn}
              nextHref={href}
              className="absolute left-3 top-3"
            />
            <CompareCheckbox listingId={listing.id} className="absolute bottom-3 left-3" />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="group relative h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-sm">
        <Link href={href} className="flex flex-1 flex-col">
          <ListingPhoto photos={photos} alt={title} className="aspect-[4/3] w-full shrink-0" />
          <div className="flex flex-1 flex-col p-[18px]">
            {badges}
            <h3 className="line-clamp-2 min-h-[3rem] text-[17px] font-semibold leading-snug">{title}</h3>
            <p className="mt-2 line-clamp-1 text-[13px] text-muted">{meta}</p>
            <div className="mt-auto pt-3">
              <p className="font-display text-[21px] font-medium">{formatPkr(listing.askingPricePkr)}</p>
            </div>
          </div>
        </Link>
        {footer && <div className="shrink-0 border-t border-border px-[18px] py-3">{footer}</div>}
      </Card>
      {showOverlayActions && (
        <>
          <FavoriteButton
            listingId={listing.id}
            favorited={favorited}
            signedIn={signedIn}
            nextHref={href}
            className="absolute right-3 top-3"
          />
          <CompareCheckbox listingId={listing.id} className="absolute left-3 top-3" />
        </>
      )}
    </div>
  );
}

function ListingPhoto({
  photos,
  alt,
  className = "",
}: {
  photos: string[];
  alt: string;
  className?: string;
}) {
  if (photos.length === 0) {
    return <div className={`photo-placeholder ${className}`}>vehicle photo</div>;
  }
  return (
    <PhotoGallery
      photos={photos}
      alt={alt}
      className={className}
      aspectClassName="h-full"
      roundedClassName="rounded-none"
      objectFit="contain"
      whiteBackground
      showArrows="hover-desktop"
      showDots
      dotsPosition="overlay"
      fadeTransition
      // Card renders at a fixed ~260-280px in the homepage's horizontal rails
      // (CarRailItem) and responsively (up to ~50vw/100vw) in the /cars browse
      // grid — this covers both without needing a per-usage sizes prop.
      imageSizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
    />
  );
}

function VerifiedPill({ verified }: { verified: boolean }) {
  if (!verified) {
    return (
      <Badge tone="review" className="shrink-0 whitespace-nowrap px-2 py-1 text-[11px]">
        Under review
      </Badge>
    );
  }
  return (
    <Badge tone="verified" className="shrink-0 whitespace-nowrap px-2 py-1 text-[11px]">
      <CheckIcon className="h-3 w-3 shrink-0" /> Verified
    </Badge>
  );
}
