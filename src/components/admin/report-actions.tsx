"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Badge, Button, Textarea } from "@/components/ui";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import {
  addInternalNoteAction,
  deleteReportedListingAction,
  dismissReportAction,
  markUnderReviewAction,
  resolveReportAction,
  sendWarningAction,
  suspendReportedListingAction,
  suspendReportedUserAction,
} from "@/lib/actions/admin-reports";
import type { ReportActionResult } from "@/lib/admin/report-mutations";

export const REPORT_STATUS_BADGE: Record<string, { tone: "verified" | "review" | "neutral"; label: string }> = {
  new: { tone: "review", label: "New" },
  triaged: { tone: "review", label: "Triaged" },
  investigating: { tone: "review", label: "Under review" },
  actioned: { tone: "verified", label: "Resolved" },
  appealed: { tone: "review", label: "Appealed" },
  closed: { tone: "neutral", label: "Dismissed" },
};

export type ReportActionTarget = {
  id: string;
  status: string;
  listingId: string | null;
  /** For a user report this is reportedUserId (cheap — already on the queue row). For a
   * listing report it's that listing's seller, which the queue intentionally doesn't
   * resolve per row (heavy data loads only when the drawer opens) — so Suspend User /
   * Send Warning on a listing report only appear once the drawer's full detail is in. */
  targetUserId: string | null;
};

/** The full report-moderation action set — used by both the queue table row and the
 * Report Details drawer, so the workflow exists in exactly one place. Suspend
 * Listing/Suspend User/Delete Listing are only offered once there's an actual accused
 * party to act on (a reported listing, or a reported user / a listing's seller). */
export function ReportActions({ report }: { report: ReportActionTarget }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [suspendListingOpen, setSuspendListingOpen] = useState(false);
  const [suspendUserOpen, setSuspendUserOpen] = useState(false);
  const [deleteListingOpen, setDeleteListingOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  const [optimisticStatus, setOptimisticStatus] = useOptimistic(report.status);

  function handleResult(result: ReportActionResult) {
    if (result.ok) showToast({ title: "Done", description: result.message, variant: "success" });
    else showToast({ title: "Action failed", description: result.error, variant: "error" });
  }

  function run(action: () => Promise<ReportActionResult>, nextStatus?: string) {
    startTransition(async () => {
      if (nextStatus) setOptimisticStatus(nextStatus);
      handleResult(await action());
    });
  }

  const badge = REPORT_STATUS_BADGE[optimisticStatus] ?? { tone: "neutral" as const, label: optimisticStatus };
  const isOpenStatus = optimisticStatus === "new" || optimisticStatus === "triaged" || optimisticStatus === "appealed";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={badge.tone} className="px-2.5 py-1 text-[11px]">
        {badge.label}
      </Badge>

      {isOpenStatus && (
        <Button type="button" disabled={isPending} onClick={() => run(() => markUnderReviewAction(report.id), "investigating")} className="px-3 py-1.5 text-[12px]">
          Mark Under Review
        </Button>
      )}

      {(isOpenStatus || optimisticStatus === "investigating") && (
        <>
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => resolveReportAction(report.id), "actioned")} className="px-3 py-1.5 text-[12px]">
            Resolve
          </Button>
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => dismissReportAction(report.id), "closed")} className="px-3 py-1.5 text-[12px]">
            Dismiss
          </Button>
        </>
      )}

      {report.targetUserId && (
        <AlertDialog
          open={warningOpen}
          onOpenChange={(o) => {
            setWarningOpen(o);
            if (!o) setWarningMessage("");
          }}
          trigger={
            <Button type="button" variant="secondary" disabled={isPending} className="px-3 py-1.5 text-[12px]">
              Send Warning
            </Button>
          }
          title="Send a warning?"
          description={
            <div className="space-y-2.5">
              <p>The accused user receives this as a notification.</p>
              <Textarea autoFocus rows={3} value={warningMessage} onChange={(e) => setWarningMessage(e.target.value)} placeholder="Warning message (required)" />
            </div>
          }
          destructive={false}
          confirmLabel="Send warning"
          confirmDisabled={!warningMessage.trim()}
          onConfirm={() => {
            const userId = report.targetUserId;
            if (userId) run(() => sendWarningAction(report.id, userId, warningMessage));
          }}
        />
      )}

      <AlertDialog
        open={noteOpen}
        onOpenChange={(o) => {
          setNoteOpen(o);
          if (!o) setNote("");
        }}
        trigger={
          <Button type="button" variant="secondary" disabled={isPending} className="px-3 py-1.5 text-[12px]">
            Add Internal Note
          </Button>
        }
        title="Add an internal note"
        description={
          <div className="space-y-2.5">
            <p>Staff-only — never shown to the reporter or the accused user.</p>
            <Textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required)" />
          </div>
        }
        destructive={false}
        confirmLabel="Add note"
        confirmDisabled={!note.trim()}
        onConfirm={() => run(() => addInternalNoteAction(report.id, note))}
      />

      {report.listingId && (
        <AlertDialog
          open={suspendListingOpen}
          onOpenChange={setSuspendListingOpen}
          trigger={
            <Button type="button" variant="secondary" disabled={isPending} className="px-3 py-1.5 text-[12px]">
              Suspend Listing
            </Button>
          }
          title="Suspend the reported listing?"
          description="It's immediately pulled from search and the seller is notified. This can be reversed from Listings."
          confirmLabel="Suspend listing"
          onConfirm={() => {
            const listingId = report.listingId;
            if (listingId) run(() => suspendReportedListingAction(report.id, listingId));
          }}
        />
      )}

      {report.targetUserId && (
        <AlertDialog
          open={suspendUserOpen}
          onOpenChange={setSuspendUserOpen}
          trigger={
            <Button type="button" variant="secondary" disabled={isPending} className="px-3 py-1.5 text-[12px]">
              Suspend User
            </Button>
          }
          title="Suspend the reported user?"
          description="Their account is restricted and every active session is signed out immediately. This can be reversed from Users."
          confirmLabel="Suspend user"
          onConfirm={() => {
            const userId = report.targetUserId;
            if (userId) run(() => suspendReportedUserAction(report.id, userId));
          }}
        />
      )}

      {report.listingId && (
        <AlertDialog
          open={deleteListingOpen}
          onOpenChange={setDeleteListingOpen}
          trigger={
            <Button type="button" variant="danger" disabled={isPending} className="px-3 py-1.5 text-[12px]">
              Delete Listing
            </Button>
          }
          title="Delete the reported listing?"
          description="This permanently removes the listing, its photos, and every message/offer/favorite tied to it. This cannot be undone."
          confirmLabel="Delete listing"
          onConfirm={() => {
            const listingId = report.listingId;
            if (listingId) run(() => deleteReportedListingAction(report.id, listingId));
          }}
        />
      )}
    </div>
  );
}
