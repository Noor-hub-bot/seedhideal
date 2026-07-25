"use client";

import { useActionState } from "react";
import {
  submitVerificationAction,
  type VerificationFormState,
} from "@/lib/actions/verification";
import { Button, Card, Input, Label, Select } from "@/components/ui";

export function VerifyForm() {
  const [state, formAction, pending] = useActionState<VerificationFormState, FormData>(
    submitVerificationAction,
    {},
  );

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="relationship">Your relationship to the vehicle</Label>
          <Select id="relationship" name="relationship" required defaultValue="owner">
            <option value="owner">I&apos;m the owner</option>
            <option value="family">Family member of the owner</option>
            <option value="representative">Representative acting for the owner</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="identityDoc">Identity document (CNIC, passport)</Label>
          <Input
            id="identityDoc"
            name="identityDoc"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
          />
        </div>
        <div>
          <Label htmlFor="ownershipDoc">Ownership document (registration book, transfer letter)</Label>
          <Input
            id="ownershipDoc"
            name="ownershipDoc"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
          />
        </div>
        <p className="text-xs text-muted">
          These documents are only ever seen by our review team — never shown publicly or to
          buyers.
        </p>
        {state.error && (
          <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting…" : "Submit for review"}
        </Button>
      </form>
    </Card>
  );
}
