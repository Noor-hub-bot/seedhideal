import Image from "next/image";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatKm, formatPkr } from "@/lib/format";
import { FavoriteButton } from "@/components/favorite-button";
import { CompareCheckbox } from "@/components/compare-checkbox";
import type { listings } from "@/db";

type Listing = typeof listings.$inferSelect;

// Listing card per the design system: stripe photo placeholder, Inter 17/600
// title with ✓ Verified pill, 13px meta line, Newsreader serif price.
export function ListingCard({
  listing,
  sellerVerified,
  photoUrl,
  favorited = false,
  signedIn = false,
  layout = "grid",
}: {
  listing: Listing;
  sellerVerified: boolean;
  photoUrl?: string;
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
            <ListingPhoto photoUrl={photoUrl} alt={title} className="w-[220px] flex-shrink-0 self-stretch" />
            <div className="flex flex-1 flex-col justify-center px-6 py-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{title}</h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  {listing.featured && (
                    <Badge tone="brand" className="whitespace-nowrap px-2 py-1 text-[11px]">
                      ★ Featured
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
          <ListingPhoto photoUrl={photoUrl} alt={title} className="h-[180px]" />
          <div className="p-[18px]">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-[17px] font-semibold">{title}</h3>
              <div className="flex shrink-0 items-center gap-1.5">
                {listing.featured && <Badge tone="brand">★ Featured</Badge>}
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
  photoUrl,
  alt,
  className = "",
}: {
  photoUrl?: string;
  alt: string;
  className?: string;
}) {
  if (!photoUrl) {
    return <div className={`photo-placeholder ${className}`}>vehicle photo</div>;
  }
  return (
    <div className={`relative ${className}`}>
      <Image src={photoUrl} alt={alt} fill className="object-cover" />
    </div>
  );
}

function VerifiedPill({ verified }: { verified: boolean }) {
  if (!verified) return <Badge tone="review">Under review</Badge>;
  return (
    <Badge tone="verified" className="whitespace-nowrap px-2 py-1 text-[11px]">
      ✓ Verified
    </Badge>
  );
}
