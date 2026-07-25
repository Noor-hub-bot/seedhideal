"use client";

import { useActionState, useState } from "react";
import { requestBoostAction, type BoostFormState } from "@/lib/actions/boosts";
import { Button, Card, Select } from "@/components/ui";
import { formatPkr } from "@/lib/format";

type Plan = { id: string; name: string; durationDays: number; pricePkr: number };

export function BoostListingForm({ listingId, plans }: { listingId: string; plans: Plan[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<BoostFormState, FormData>(
    requestBoostAction,
    {},
  );

  if (state.requested) {
    return <p className="text-[13px] text-muted">✓ Request sent — our team will review it shortly.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-brand hover:text-brand-strong"
      >
        ★ Boost this listing
      </button>
    );
  }

  return (
    <Card className="p-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="listingId" value={listingId} />
        <Select name="planId" required defaultValue="">
          <option value="" disabled>
            Choose a plan
          </option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.durationDays} days ({formatPkr(p.pricePkr)})
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted">
          Billing isn&apos;t wired up yet — our team activates approved requests manually.
        </p>
        {state.error && (
          <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
            {state.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Requesting…" : "Request boost"}
          </Button>
          <Button type="button" variant="tertiary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
