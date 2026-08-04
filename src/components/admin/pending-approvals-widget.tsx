import Image from "next/image";
import Link from "next/link";
import { moderateListingAction } from "@/lib/actions/marketplace";
import { Button, Input } from "@/components/ui";
import { formatDate, formatPkr } from "@/lib/format";
import type { PendingApproval } from "@/lib/admin/pending-approvals";
import { EmptyState } from "./section-card";

/** Compact preview of the moderation queue with real Approve/Reject/View actions —
 * the exact same server action (moderateListingAction) the full queue at
 * /admin/moderation uses, not a second copy of the approval logic. */
export function PendingApprovalsWidget({ items }: { items: PendingApproval[] }) {
  if (items.length === 0) return <EmptyState>The queue is clear — nothing waiting for review.</EmptyState>;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center gap-4 rounded-input border border-border p-3.5">
          <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-input bg-neutral-chip">
            {item.photoUrl ? (
              <Image src={item.photoUrl} alt={item.title} fill className="object-cover" sizes="80px" />
            ) : (
              <div className="photo-placeholder h-full w-full text-[9px]">no photo</div>
            )}
          </div>

          <div className="min-w-[180px] flex-1">
            <p className="truncate text-[13px] font-semibold">{item.title}</p>
            <p className="mt-0.5 truncate text-[12px] text-muted">
              {item.sellerName} · {item.city} · {formatPkr(item.price)}
            </p>
            <p className="text-[11px] text-muted">Submitted {formatDate(item.createdAt)}</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={`/cars/${item.id}`}
              target="_blank"
              className="rounded-control border border-border-input px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-background"
            >
              View
            </Link>
            <form action={moderateListingAction}>
              <input type="hidden" name="listingId" value={item.id} />
              <input type="hidden" name="decision" value="approve" />
              <Button type="submit" className="px-3 py-2 text-[12px]">
                Approve
              </Button>
            </form>
            <details className="group">
              <summary className="list-none">
                <span className="inline-flex cursor-pointer rounded-control border border-border-input px-3 py-2 text-[12px] font-semibold text-alert-ink hover:bg-alert-soft">
                  Reject
                </span>
              </summary>
              <form action={moderateListingAction} className="mt-2 flex gap-2">
                <input type="hidden" name="listingId" value={item.id} />
                <input type="hidden" name="decision" value="reject" />
                <Input name="reason" placeholder="Reason (required)" required className="w-48 py-2 text-[12px]" />
                <Button type="submit" variant="secondary" className="px-3 py-2 text-[12px]">
                  Confirm
                </Button>
              </form>
            </details>
          </div>
        </div>
      ))}
    </div>
  );
}
