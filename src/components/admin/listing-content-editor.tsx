"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { updateListingContentAction } from "@/lib/actions/admin-listings";
import { FEATURES } from "@/lib/constants";

/** Staff-only editor for the two fields the public Car Details page's "Car Overview" and
 * "Features & Highlights" sections read from — collapsed to a summary by default, an
 * inline edit form on demand. Deliberately not a full listing editor (see
 * updateListingContentAsStaff's comment): admins already have approve/reject/suspend for
 * moderation, this exists only to let staff fix or fill in a listing's own content. */
export function ListingContentEditor({
  listingId,
  description,
  features,
}: {
  listingId: string;
  description: string | null;
  features: string[] | null;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [descValue, setDescValue] = useState(description ?? "");
  const [featuresValue, setFeaturesValue] = useState<Set<string>>(new Set(features ?? []));

  function toggleFeature(f: string) {
    setFeaturesValue((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  function reset() {
    setDescValue(description ?? "");
    setFeaturesValue(new Set(features ?? []));
    setEditing(false);
  }

  function save() {
    startTransition(async () => {
      const result = await updateListingContentAction(listingId, { description: descValue, features: [...featuresValue] });
      if (result.ok) {
        showToast({ title: "Saved", description: result.message, variant: "success" });
        setEditing(false);
      } else {
        showToast({ title: "Couldn't save", description: result.error, variant: "error" });
      }
    });
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        {description ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-body-soft">{description}</p>
        ) : (
          <p className="text-[13px] text-muted">No overview description yet.</p>
        )}
        {features && features.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {features.map((f) => (
              <span key={f} className="rounded-full bg-neutral-chip px-2.5 py-1 text-[11px] font-medium text-muted">
                {f}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">No features selected yet.</p>
        )}
        <Button type="button" variant="secondary" className="px-3 py-1.5 text-[12px]" onClick={() => setEditing(true)}>
          Edit overview &amp; features
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="admin-listing-description" className="mb-1.5 block text-[12px] font-semibold text-foreground">
          Car Overview
        </label>
        <Textarea
          id="admin-listing-description"
          rows={5}
          value={descValue}
          onChange={(e) => setDescValue(e.target.value)}
          maxLength={4000}
        />
      </div>
      <div>
        <span className="mb-1.5 block text-[12px] font-semibold text-foreground">Features &amp; Highlights</span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <label key={f} className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={featuresValue.has(f)}
                onChange={() => toggleFeature(f)}
                className="h-4 w-4 rounded border-border-input accent-[var(--color-brand)]"
              />
              {f}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" disabled={isPending} onClick={save} className="px-3 py-1.5 text-[12px]">
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={reset} className="px-3 py-1.5 text-[12px]">
          Cancel
        </Button>
      </div>
    </div>
  );
}
