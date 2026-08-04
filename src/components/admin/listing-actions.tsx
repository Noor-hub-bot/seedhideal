"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Badge, Button, Input } from "@/components/ui";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import {
  approveListingAction,
  deleteListingAction,
  featureListingAction,
  markListingSoldAction,
  pauseListingAction,
  rejectListingAction,
  restoreListingAction,
  resumeListingAction,
  suspendListingAction,
  unfeatureListingAction,
  type ListingActionResult,
} from "@/lib/actions/admin-listings";

export const STATUS_BADGE: Record<string, { tone: "verified" | "review" | "neutral"; label: string }> = {
  active: { tone: "verified", label: "Active" },
  submitted: { tone: "review", label: "Submitted" },
  under_review: { tone: "review", label: "Under review" },
  correction: { tone: "review", label: "Correction" },
  paused: { tone: "neutral", label: "Paused" },
  suspended: { tone: "review", label: "Suspended" },
  sold: { tone: "neutral", label: "Sold" },
  expired: { tone: "neutral", label: "Expired" },
  closed: { tone: "neutral", label: "Closed" },
  draft: { tone: "neutral", label: "Draft" },
};

const MODERATION_STATES = new Set(["submitted", "under_review", "correction"]);

/** The full moderation-workflow action set for one listing — used by both the table
 * row (compact) and the Listing Details drawer, so approve/reject/suspend/restore/
 * pause/resume/mark-sold/feature/delete logic exists in exactly one place. Buttons
 * shown depend on the listing's current status, mirroring real moderation semantics. */
export function ListingActions({ listing }: { listing: { id: string; status: string; featured: boolean } }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [optimisticStatus, setOptimisticStatus] = useOptimistic(listing.status);
  const [optimisticFeatured, setOptimisticFeatured] = useOptimistic(listing.featured);

  function handleResult(result: ListingActionResult) {
    if (result.ok) showToast({ title: "Done", description: result.message, variant: "success" });
    else showToast({ title: "Action failed", description: result.error, variant: "error" });
  }

  function run(action: () => Promise<ListingActionResult>, optimisticStatusValue?: string) {
    startTransition(async () => {
      if (optimisticStatusValue) setOptimisticStatus(optimisticStatusValue);
      handleResult(await action());
    });
  }

  function runFeature(next: boolean) {
    startTransition(async () => {
      setOptimisticFeatured(next);
      handleResult(await (next ? featureListingAction(listing.id) : unfeatureListingAction(listing.id)));
    });
  }

  const badge = STATUS_BADGE[optimisticStatus] ?? { tone: "neutral" as const, label: optimisticStatus };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={badge.tone} className="px-2.5 py-1 text-[11px]">
        {badge.label}
      </Badge>
      {optimisticFeatured && (
        <Badge tone="gold" className="px-2.5 py-1 text-[11px]">
          Featured
        </Badge>
      )}

      {MODERATION_STATES.has(optimisticStatus) && (
        <>
          <Button type="button" disabled={isPending} onClick={() => run(() => approveListingAction(listing.id), "active")} className="px-3 py-1.5 text-[12px]">
            Approve
          </Button>
          <AlertDialog
            open={rejectOpen}
            onOpenChange={(o) => {
              setRejectOpen(o);
              if (!o) setRejectReason("");
            }}
            trigger={
              <Button type="button" variant="secondary" disabled={isPending} className="px-3 py-1.5 text-[12px]">
                Reject
              </Button>
            }
            title="Reject this listing?"
            description={
              <div className="space-y-2.5">
                <p>The seller sees this reason and can correct and resubmit.</p>
                <Input
                  autoFocus
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason (required)"
                />
              </div>
            }
            confirmLabel="Reject"
            confirmDisabled={!rejectReason.trim()}
            onConfirm={() => run(() => rejectListingAction(listing.id, rejectReason), "correction")}
          />
        </>
      )}

      {optimisticStatus === "active" && (
        <>
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => pauseListingAction(listing.id), "paused")} className="px-3 py-1.5 text-[12px]">
            Pause
          </Button>
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => markListingSoldAction(listing.id), "sold")} className="px-3 py-1.5 text-[12px]">
            Mark Sold
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => runFeature(!optimisticFeatured)}
            className="px-3 py-1.5 text-[12px]"
          >
            {optimisticFeatured ? "Unfeature" : "Feature"}
          </Button>
        </>
      )}

      {optimisticStatus === "paused" && (
        <Button type="button" disabled={isPending} onClick={() => run(() => resumeListingAction(listing.id), "active")} className="px-3 py-1.5 text-[12px]">
          Resume
        </Button>
      )}

      {(optimisticStatus === "active" || optimisticStatus === "paused") && (
        <AlertDialog
          open={suspendOpen}
          onOpenChange={setSuspendOpen}
          trigger={
            <Button type="button" variant="secondary" disabled={isPending} className="px-3 py-1.5 text-[12px]">
              Suspend
            </Button>
          }
          title="Suspend this listing?"
          description="It's immediately pulled from search and the seller is notified. This can be reversed with Restore."
          confirmLabel="Suspend"
          onConfirm={() => run(() => suspendListingAction(listing.id), "suspended")}
        />
      )}

      {optimisticStatus === "suspended" && (
        <Button type="button" disabled={isPending} onClick={() => run(() => restoreListingAction(listing.id), "active")} className="px-3 py-1.5 text-[12px]">
          Restore
        </Button>
      )}

      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        trigger={
          <Button type="button" variant="danger" disabled={isPending} className="px-3 py-1.5 text-[12px]">
            Delete
          </Button>
        }
        title="Delete this listing?"
        description="This permanently removes the listing, its photos, and every message/offer/favorite tied to it. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => run(() => deleteListingAction(listing.id))}
      />
    </div>
  );
}
