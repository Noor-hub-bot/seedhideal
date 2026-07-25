"use client";

import { useActionState } from "react";
import {
  sendInquiryAction,
  type InquiryFormState,
} from "@/lib/actions/marketplace";
import Link from "next/link";
import { Button, ButtonLink, Card, Label, Select, Textarea } from "@/components/ui";

export function InquiryForm({
  listingId,
  signedIn,
}: {
  listingId: string;
  signedIn: boolean;
}) {
  const [state, formAction, pending] = useActionState<InquiryFormState, FormData>(
    sendInquiryAction,
    {},
  );

  if (!signedIn) {
    return (
      <Card className="p-5 text-center">
        <p className="mb-3 text-sm text-muted">
          Sign in with your phone number to contact the seller. Their number
          stays protected — the conversation happens here.
        </p>
        <ButtonLink href={`/signin?next=/cars/${listingId}`}>
          Sign in to contact seller
        </ButtonLink>
      </Card>
    );
  }

  if (state.sent) {
    return (
      <Card className="bg-brand-soft p-5 text-center">
        <p className="font-semibold text-brand-soft-ink">✓ Inquiry sent</p>
        <p className="mt-1 text-sm text-foreground">
          The seller has been notified and can reply from their dashboard.
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-block text-[13px] font-semibold text-brand hover:text-brand-strong"
        >
          View your inquiries
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-semibold">Contact the seller</h2>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="listingId" value={listingId} />
        <div>
          <Label htmlFor="intent">I want to…</Label>
          <Select id="intent" name="intent" required defaultValue="question">
            <option value="question">Ask a question</option>
            <option value="offer">Discuss an offer</option>
            <option value="visit">Request a visit</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            name="body"
            rows={3}
            placeholder="e.g. Is the car available this weekend? Are all documents complete?"
            required
          />
        </div>
        {state.error && (
          <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send inquiry"}
        </Button>
      </form>
    </Card>
  );
}
