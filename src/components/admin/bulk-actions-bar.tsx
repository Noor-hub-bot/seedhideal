"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import {
  bulkApproveListingsAction,
  bulkDeleteListingsAction,
  bulkFeatureListingsAction,
  bulkPauseListingsAction,
  bulkRejectListingsAction,
  bulkResumeListingsAction,
  bulkUnfeatureListingsAction,
  type BulkActionResult,
} from "@/lib/actions/admin-listings";

/** Appears once at least one row is selected — every button acts on the full
 * selection in one round trip (see runBulk in admin-listings.ts), not N sequential
 * single-listing calls from the client. */
export function BulkActionsBar({ selectedIds, onDone }: { selectedIds: string[]; onDone: () => void }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (selectedIds.length === 0) return null;

  function report(result: BulkActionResult) {
    if (result.failed === 0) {
      showToast({
        title: "Done",
        description: `${result.succeeded} listing${result.succeeded === 1 ? "" : "s"} updated.`,
        variant: "success",
      });
    } else {
      showToast({
        title: result.succeeded > 0 ? "Partially completed" : "Action failed",
        description: `${result.succeeded} succeeded, ${result.failed} failed. ${result.errors[0] ?? ""}`,
        variant: "error",
      });
    }
    onDone();
  }

  function run(action: () => Promise<BulkActionResult>) {
    startTransition(async () => {
      report(await action());
    });
  }

  const count = selectedIds.length;
  const idsQuery = encodeURIComponent(selectedIds.join(","));

  return (
    <div className="sticky top-4 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-soft bg-brand-soft px-4 py-3 shadow-sm">
      <span className="text-[13px] font-semibold text-brand-soft-ink">
        {count} selected
      </span>

      <Button type="button" disabled={isPending} onClick={() => run(() => bulkApproveListingsAction(selectedIds))} className="px-3 py-1.5 text-[12px]">
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
        title={`Reject ${count} listing${count === 1 ? "" : "s"}?`}
        description={
          <div className="space-y-2.5">
            <p>The same reason is sent to every affected seller.</p>
            <Input autoFocus value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (required)" />
          </div>
        }
        confirmLabel="Reject"
        confirmDisabled={!rejectReason.trim()}
        onConfirm={() => run(() => bulkRejectListingsAction(selectedIds, rejectReason))}
      />

      <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => bulkPauseListingsAction(selectedIds))} className="px-3 py-1.5 text-[12px]">
        Pause
      </Button>
      <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => bulkResumeListingsAction(selectedIds))} className="px-3 py-1.5 text-[12px]">
        Resume
      </Button>
      <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => bulkFeatureListingsAction(selectedIds))} className="px-3 py-1.5 text-[12px]">
        Feature
      </Button>
      <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => bulkUnfeatureListingsAction(selectedIds))} className="px-3 py-1.5 text-[12px]">
        Unfeature
      </Button>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        trigger={
          <Button type="button" variant="danger" disabled={isPending} className="px-3 py-1.5 text-[12px]">
            Delete
          </Button>
        }
        title={`Delete ${count} listing${count === 1 ? "" : "s"}?`}
        description="This permanently removes every selected listing and everything tied to it (photos, messages, offers, favorites). This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => run(() => bulkDeleteListingsAction(selectedIds))}
      />

      <a
        href={`/api/admin/listings/export?ids=${idsQuery}`}
        className="ml-auto rounded-control border border-border-input bg-surface px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-background"
      >
        Export CSV
      </a>
    </div>
  );
}
