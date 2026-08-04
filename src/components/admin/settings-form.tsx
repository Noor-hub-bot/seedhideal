"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import type { SettingsActionResult } from "@/lib/actions/admin-settings";

/** Shared "one settings tab" form shell — dirty-tracking, a sticky Save/Discard bar that
 * only appears once something actually changed, a real `beforeunload` warning, and a
 * toast on save. Used identically by every section tab (General/Homepage/Social/Footer/
 * SEO/Media/Maintenance) so this UX (Section 10 of the settings goal) exists in exactly
 * one place rather than being re-implemented per tab. */
export function SettingsSectionForm({
  action,
  children,
  confirmDescription,
}: {
  action: (formData: FormData) => Promise<SettingsActionResult>;
  children: ReactNode;
  /** When set, saving asks for confirmation first (e.g. turning maintenance mode on
   * takes the live site down for every non-staff visitor). */
  confirmDescription?: string;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function doSave() {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        showToast({ title: "Saved", description: result.message, variant: "success" });
        setDirty(false);
      } else {
        showToast({ title: "Couldn't save", description: result.error, variant: "error" });
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (confirmDescription) setConfirmOpen(true);
    else doSave();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={() => setDirty(true)} className="space-y-6 pb-6">
      {children}

      <div
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur transition-transform duration-200 ${
          dirty ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-[13px] font-medium text-muted">You have unsaved changes.</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="px-4 py-2 text-[13px]"
              onClick={() => {
                formRef.current?.reset();
                setDirty(false);
              }}
            >
              Discard
            </Button>
            <Button type="submit" disabled={isPending} className="px-4 py-2 text-[13px]">
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>

      {confirmDescription && (
        <AlertDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Save these changes?"
          description={confirmDescription}
          confirmLabel="Save"
          destructive={false}
          onConfirm={() => {
            setConfirmOpen(false);
            doSave();
          }}
        />
      )}
    </form>
  );
}

/** A labeled field wrapper — consistent spacing/label style across every settings form,
 * reused instead of repeating the same label+hint markup per field. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}
