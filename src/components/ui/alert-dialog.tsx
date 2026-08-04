"use client";

import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";

// Confirmation dialog for dangerous actions (suspend/delete) — Radix's AlertDialog
// specifically (not a generic Dialog) since it requires an explicit Cancel/Confirm
// choice rather than dismiss-by-clicking-outside. Styled with this project's existing
// tokens (Card surface, the existing Button component for actions) rather than a
// separate visual language.
export function AlertDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  confirmDisabled = false,
}: {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}) {
  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixAlertDialog.Trigger asChild>{trigger}</RadixAlertDialog.Trigger>}
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-foreground/40" />
        <RadixAlertDialog.Content className="alert-dialog-content fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-surface p-6 shadow-lg">
          <RadixAlertDialog.Title className="font-display text-lg font-medium">{title}</RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </RadixAlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <RadixAlertDialog.Cancel asChild>
              <Button variant="secondary" type="button">
                {cancelLabel}
              </Button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <Button
                variant={destructive ? "danger" : "primary"}
                type="button"
                disabled={confirmDisabled}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}
