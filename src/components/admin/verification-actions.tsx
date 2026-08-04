"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Badge, Button, Input } from "@/components/ui";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import {
  adminApproveVerificationAction,
  adminRejectVerificationAction,
  adminRequestResubmissionAction,
  type VerificationActionResult,
} from "@/lib/actions/admin-verification";

export const VERIFICATION_STATUS_BADGE: Record<string, { tone: "verified" | "review" | "neutral"; label: string }> = {
  pending: { tone: "review", label: "Pending" },
  verified: { tone: "verified", label: "Verified" },
  rejected: { tone: "neutral", label: "Rejected" },
  action_required: { tone: "review", label: "Resubmission requested" },
  expired: { tone: "neutral", label: "Expired" },
  suspended: { tone: "neutral", label: "Suspended" },
};

/** Approve / Reject / Request Resubmission for one verification case — used by both
 * the queue table row and the document-viewer drawer, so the workflow exists in
 * exactly one place. Only shown when the case is still "pending" (the only state any
 * of these three transitions is legal from — enforced again server-side regardless). */
export function VerificationActions({ caseData }: { caseData: { id: string; status: string } }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitReason, setResubmitReason] = useState("");

  const [optimisticStatus, setOptimisticStatus] = useOptimistic(caseData.status);

  function handleResult(result: VerificationActionResult) {
    if (result.ok) showToast({ title: "Done", description: result.message, variant: "success" });
    else showToast({ title: "Action failed", description: result.error, variant: "error" });
  }

  function run(action: () => Promise<VerificationActionResult>, nextStatus: string) {
    startTransition(async () => {
      setOptimisticStatus(nextStatus);
      handleResult(await action());
    });
  }

  const badge = VERIFICATION_STATUS_BADGE[optimisticStatus] ?? { tone: "neutral" as const, label: optimisticStatus };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={badge.tone} className="px-2.5 py-1 text-[11px]">
        {badge.label}
      </Badge>

      {optimisticStatus === "pending" && (
        <>
          <Button type="button" disabled={isPending} onClick={() => run(() => adminApproveVerificationAction(caseData.id), "verified")} className="px-3 py-1.5 text-[12px]">
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
            title="Reject this verification?"
            description={
              <div className="space-y-2.5">
                <p>The applicant sees this reason.</p>
                <Input autoFocus value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (required)" />
              </div>
            }
            confirmLabel="Reject"
            confirmDisabled={!rejectReason.trim()}
            onConfirm={() => run(() => adminRejectVerificationAction(caseData.id, rejectReason), "rejected")}
          />

          <AlertDialog
            open={resubmitOpen}
            onOpenChange={(o) => {
              setResubmitOpen(o);
              if (!o) setResubmitReason("");
            }}
            trigger={
              <Button type="button" variant="secondary" disabled={isPending} className="px-3 py-1.5 text-[12px]">
                Request Resubmission
              </Button>
            }
            title="Request new documents?"
            description={
              <div className="space-y-2.5">
                <p>Explain what&apos;s missing or unclear — the applicant sees this and can resubmit.</p>
                <Input autoFocus value={resubmitReason} onChange={(e) => setResubmitReason(e.target.value)} placeholder="Reason (required)" />
              </div>
            }
            destructive={false}
            confirmLabel="Request resubmission"
            confirmDisabled={!resubmitReason.trim()}
            onConfirm={() => run(() => adminRequestResubmissionAction(caseData.id, resubmitReason), "action_required")}
          />
        </>
      )}
    </div>
  );
}
