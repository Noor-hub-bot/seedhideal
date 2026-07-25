"use client";

import { useActionState } from "react";
import { createTicketAction, type TicketFormState } from "@/lib/actions/support";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";

export function NewTicketForm() {
  const [state, formAction, pending] = useActionState<TicketFormState, FormData>(
    createTicketAction,
    {},
  );

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" required maxLength={200} placeholder="e.g. Can't upload photos" />
        </div>
        <div>
          <Label htmlFor="severity">Severity</Label>
          <Select id="severity" name="severity" required defaultValue="standard">
            <option value="low">Low</option>
            <option value="standard">Standard</option>
            <option value="payment">Payment issue</option>
            <option value="safety">Safety concern</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="body">Describe your issue</Label>
          <Textarea id="body" name="body" rows={5} required />
        </div>
        {state.error && (
          <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting…" : "Submit ticket"}
        </Button>
      </form>
    </Card>
  );
}
