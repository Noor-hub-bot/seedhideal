"use client";

import { useActionState } from "react";
import { replyToTicketAction, type TicketReplyState } from "@/lib/actions/support";
import { Button, Textarea } from "@/components/ui";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const [state, formAction, pending] = useActionState<TicketReplyState, FormData>(
    replyToTicketAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Textarea name="body" rows={3} placeholder="Write a reply…" required />
      {state.error && (
        <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
