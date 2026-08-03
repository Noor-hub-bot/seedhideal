import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatKm, formatPkr } from "@/lib/format";
import { FavoriteButton } from "@/components/favorite-button";
import { CompareCheckbox } from "@/components/compare-checkbox";
import { CheckIcon, StarIcon } from "@/components/home/icons";
import { PhotoGallery } from "@/components/photo-gallery";
import type { listings } from "@/db";

type Listing = typeof listings.$inferSelect;

// Listing card per the design system: stripe photo placeholder, Inter 17/600
// title with ✓ Verified pill, 13px meta line, Newsreader serif price.
export function ListingCard({
  listing,
  sellerVerified,
  photos = [],
  favorited = false,
  signedIn = false,
  layout = "grid",
}: {
  listing: Listing;
  sellerVerified: boolean;
  photos?: string[];
  favorited?: boolean;
  signedIn?: boolean;
  layout?: "grid" | "list";
}) {
  const title = `${listing.make} ${listing.model}${listing.variant ? ` ${listing.variant}` : ""}, ${listing.year}`;
  const meta = `${listing.city} · ${formatKm(listing.mileageKm)} · ${listing.transmission === "automatic" ? "Automatic" : "Manual"}`;
  const href = `/cars/${listing.id}`;

  if (layout === "list") {
    return (
      <div className="group relative block">
        <Link href={href} className="block">
          <Card className="flex overflow-hidden transition-shadow group-hover:shadow-sm">
            <ListingPhoto photos={photos} alt={title} className="w-[220px] flex-shrink-0 self-stretch" />
            <div className="flex flex-1 flex-col justify-center px-6 py-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{title}</h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  {listing.featured && (
                    <Badge tone="brand" className="whitespace-nowrap px-2 py-1 text-[11px]">
                      <StarIcon className="h-3 w-3 shrink-0" /> Featured
                    </Badge>
                  )}
                  {listing.sellerType === "dealer" && (
                    <Badge tone="neutral" className="whitespace-nowrap px-2 py-1 text-[11px]">
                      Dealer
                    </Badge>
                  )}
                  <VerifiedPill verified={sellerVerified} />
                </div>
              </div>
              <p className="mb-3 text-[13px] text-muted">{meta}</p>
              <p className="font-display text-[21px] font-medium">
                {formatPkr(listing.askingPricePkr)}
              </p>
            </div>
          </Card>
        </Link>
        <FavoriteButton
          listingId={listing.id}
          favorited={favorited}
          signedIn={signedIn}
          nextHref={href}
          className="absolute left-3 top-3"
        />
        <CompareCheckbox listingId={listing.id} className="absolute bottom-3 left-3" />
      </div>
    );
  }

  return (
    <div className="group relative block">
      <Link href={href} className="block">
        <Card className="overflow-hidden transition-shadow group-hover:shadow-sm">
          <ListingPhoto photos={photos} alt={title} className="h-[180px]" />
          <div className="p-[18px]">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-[17px] font-semibold">{title}</h3>
              <div className="flex shrink-0 items-center gap-1.5">
                {listing.featured && (
                  <Badge tone="brand">
                    <StarIcon className="h-3 w-3 shrink-0" /> Featured
                  </Badge>
                )}
                {listing.sellerType === "dealer" && <Badge tone="neutral">Dealer</Badge>}
                <VerifiedPill verified={sellerVerified} />
              </div>
            </div>
            <p className="mb-3 text-[13px] text-muted">{meta}</p>
            <p className="font-display text-[21px] font-medium">
              {formatPkr(listing.askingPricePkr)}
            </p>
          </div>
        </Card>
      </Link>
      <FavoriteButton
        listingId={listing.id}
        favorited={favorited}
        signedIn={signedIn}
        nextHref={href}
        className="absolute right-3 top-3"
      />
      <CompareCheckbox listingId={listing.id} className="absolute left-3 top-3" />
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
  if (!verified) return <Badge tone="review">Under review</Badge>;
  return (
    <Badge tone="verified" className="whitespace-nowrap px-2 py-1 text-[11px]">
      <CheckIcon className="h-3 w-3 shrink-0" /> Verified
    </Badge>
  );
}
