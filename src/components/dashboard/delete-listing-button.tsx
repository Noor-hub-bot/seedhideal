"use client";

import { useActionState } from "react";
import { deleteListingAction, type DeleteListingState } from "@/lib/actions/marketplace";
import { Button } from "@/components/ui";

const CONFIRM_MESSAGE =
  "Are you sure you want to permanently delete this listing? This action cannot be undone.";

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState<DeleteListingState, FormData>(deleteListingAction, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(CONFIRM_MESSAGE)) e.preventDefault();
      }}
    >
      <input type="hidden" name="listingId" value={listingId} />
      {state.error && (
        <p role="alert" className="mb-1.5 text-xs text-alert-ink">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="danger" disabled={pending} className="px-2 py-2 text-xs">
        {pending ? "Deleting…" : "Delete"}
      </Button>
    </form>
  );
}
