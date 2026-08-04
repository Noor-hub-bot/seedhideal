"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

// A slide-in side panel (Listing Details drawer) — Radix's plain Dialog rather than
// AlertDialog (that one's reserved for destructive confirmations, see
// src/components/ui/alert-dialog.tsx), styled with this project's existing tokens.
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-foreground/40" />
        <RadixDialog.Content
          className="sheet-content fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface shadow-lg outline-none"
          aria-describedby={description ? undefined : "sheet-no-description"}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border p-6">
            <div className="min-w-0">
              <RadixDialog.Title className="truncate font-display text-lg font-medium">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-0.5 text-[13px] text-muted">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description id="sheet-no-description" className="sr-only">
                  Details panel
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Close"
              className="shrink-0 rounded-full p-1.5 text-xl leading-none text-muted hover:bg-background hover:text-foreground"
            >
              ×
            </RadixDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
