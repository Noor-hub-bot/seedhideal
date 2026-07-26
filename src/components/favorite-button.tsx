import Link from "next/link";
import { toggleFavoriteAction } from "@/lib/actions/favorites";

// Rendered as a sibling of the listing <Link>, never nested inside it — an
// interactive <button> inside an <a> is invalid HTML and would double-fire navigation.
export function FavoriteButton({
  listingId,
  favorited,
  signedIn,
  nextHref,
  className = "",
}: {
  listingId: string;
  favorited: boolean;
  signedIn: boolean;
  nextHref: string;
  className?: string;
}) {
  const base =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white";

  if (!signedIn) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(nextHref)}`}
        aria-label="Sign in to save this listing"
        className={`${base} text-muted ${className}`}
      >
        <HeartIcon filled={false} className="h-[18px] w-[18px]" />
      </Link>
    );
  }

  return (
    <form action={toggleFavoriteAction} className={className}>
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        aria-label={favorited ? "Remove from saved listings" : "Save listing"}
        aria-pressed={favorited}
        className={`${base} ${favorited ? "text-alert" : "text-muted"}`}
      >
        <HeartIcon filled={favorited} className="h-[18px] w-[18px]" />
      </button>
    </form>
  );
}

function HeartIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
