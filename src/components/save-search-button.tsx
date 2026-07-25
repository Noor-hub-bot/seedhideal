"use client";

import { useActionState, useState } from "react";
import { saveSearchAction, type SaveSearchFormState } from "@/lib/actions/saved-searches";
import { Button, Input } from "@/components/ui";

export function SaveSearchButton({ queryString }: { queryString: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<SaveSearchFormState, FormData>(
    saveSearchAction,
    {},
  );

  if (state.saved) {
    return <p className="text-[13px] font-semibold text-brand">✓ Search saved</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-brand hover:text-brand-strong"
      >
        Save this search
      </button>
    );
  }

  return (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="queryString" value={queryString} />
      <Input name="name" placeholder="e.g. Toyota under 50 lac" required className="h-9 py-0 text-xs" />
      <Button type="submit" disabled={pending} className="whitespace-nowrap px-3 py-2 text-xs">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
