"use client";

import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { submitReportAction, type ReportFormState } from "@/lib/actions/reports";
import { Button, Card, Label, Select, Textarea } from "@/components/ui";

const CATEGORIES = [
  { value: "fake_listing", label: "Fake or misleading listing" },
  { value: "ownership_concern", label: "Ownership concern" },
  { value: "dealer_mislabeling", label: "Dealer posing as private owner" },
  { value: "scam_request", label: "Scam or suspicious request" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "incorrect_condition", label: "Incorrect condition disclosure" },
];

export function ReportForm({
  listingId,
  reportedUserId,
  signedIn,
  label = "Report a concern",
}: {
  listingId?: string;
  reportedUserId?: string;
  signedIn: boolean;
  label?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ReportFormState, FormData>(
    submitReportAction,
    {},
  );

  if (!signedIn) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(pathname)}`}
        className="text-[13px] font-semibold text-muted hover:text-foreground"
      >
        Sign in to report a concern
      </Link>
    );
  }

  if (state.sent) {
    return <p className="text-[13px] text-muted">✓ Thanks — our team will review this.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-muted hover:text-alert-ink"
      >
        {label}
      </button>
    );
  }

  return (
    <Card className="p-4">
      <form action={formAction} className="space-y-3">
        {listingId && <input type="hidden" name="listingId" value={listingId} />}
        {reportedUserId && <input type="hidden" name="reportedUserId" value={reportedUserId} />}
        <div>
          <Label htmlFor="category">Reason</Label>
          <Select id="category" name="category" required defaultValue="">
            <option value="" disabled>
              Choose a reason
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="detail">Details (optional)</Label>
          <Textarea id="detail" name="detail" rows={3} placeholder="Anything that helps our team review this" />
        </div>
        {state.error && (
          <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
            {state.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Sending…" : "Submit report"}
          </Button>
          <Button type="button" variant="tertiary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
