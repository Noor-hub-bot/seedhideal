import {
  markListingSoldAction,
  pauseListingAction,
  resumeListingAction,
  withdrawListingAction,
} from "@/lib/actions/marketplace";
import { Badge, Button, Input } from "@/components/ui";
import { BoostListingForm } from "@/components/boost-listing-form";
import { formatDate } from "@/lib/format";
import type { featuredPlans, listingBoosts, listings } from "@/db";

type Listing = typeof listings.$inferSelect;
type Boost = typeof listingBoosts.$inferSelect;
type Plan = typeof featuredPlans.$inferSelect;

export function BoostStatus({
  listing,
  boost,
  plans,
}: {
  listing: Listing;
  boost?: Boost;
  plans: Plan[];
}) {
  if (listing.featured && boost?.status === "active") {
    return (
      <Badge tone="brand">
        ★ Featured{boost.expiresAt ? ` until ${formatDate(boost.expiresAt)}` : ""}
      </Badge>
    );
  }
  if (boost?.status === "pending") {
    return <p className="text-[13px] text-muted">★ Featured request pending review</p>;
  }
  if (listing.status !== "active" || plans.length === 0) return null;
  return <BoostListingForm listingId={listing.id} plans={plans} />;
}

export function ListingActions({ status, listingId }: { status: string; listingId: string }) {
  if (status === "active") {
    return (
      <div className="flex items-center gap-2">
        <form action={markListingSoldAction} className="flex items-center gap-1.5">
          <input type="hidden" name="listingId" value={listingId} />
          <Input
            name="reportedSoldPricePkr"
            type="number"
            placeholder="Sold price (optional)"
            className="h-9 w-40 px-2.5 py-0 text-xs"
          />
          <Button type="submit" variant="secondary" className="px-3 py-2 text-xs">
            Mark sold
          </Button>
        </form>
        <form action={pauseListingAction}>
          <input type="hidden" name="listingId" value={listingId} />
          <Button type="submit" variant="tertiary" className="px-2 py-2 text-xs">
            Pause
          </Button>
        </form>
      </div>
    );
  }
  if (status === "paused") {
    return (
      <div className="flex items-center gap-2">
        <form action={resumeListingAction}>
          <input type="hidden" name="listingId" value={listingId} />
          <Button type="submit" variant="secondary" className="px-3 py-2 text-xs">
            Resume
          </Button>
        </form>
        <form action={markListingSoldAction}>
          <input type="hidden" name="listingId" value={listingId} />
          <Button type="submit" variant="tertiary" className="px-2 py-2 text-xs">
            Mark sold
          </Button>
        </form>
      </div>
    );
  }
  if (["draft", "submitted", "under_review", "correction"].includes(status)) {
    return (
      <form action={withdrawListingAction}>
        <input type="hidden" name="listingId" value={listingId} />
        <Button type="submit" variant="tertiary" className="px-2 py-2 text-xs">
          Withdraw
        </Button>
      </form>
    );
  }
  return null;
}
