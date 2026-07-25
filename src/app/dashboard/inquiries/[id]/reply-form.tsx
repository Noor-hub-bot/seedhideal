"use client";

import { useActionState } from "react";
import { replyToInquiryAction, type ReplyFormState } from "@/lib/actions/marketplace";
import { Button, Textarea } from "@/components/ui";

export function ReplyForm({ inquiryId }: { inquiryId: string }) {
  const [state, formAction, pending] = useActionState<ReplyFormState, FormData>(
    replyToInquiryAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <Textarea name="body" rows={3} placeholder="Write a reply…" required />
      {state.error && (
        <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reply"}
      </Button>
    </form>
  );
}
