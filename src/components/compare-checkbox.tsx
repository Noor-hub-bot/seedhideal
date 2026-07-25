"use client";

import { useSyncExternalStore } from "react";
import {
  getCompareSnapshot,
  getServerCompareSnapshot,
  subscribeCompare,
  toggleCompareId,
} from "@/lib/compare-storage";

// Rendered as a sibling of the listing <Link>, same reasoning as
// FavoriteButton — an interactive control inside an <a> is invalid HTML.
export function CompareCheckbox({ listingId, className = "" }: { listingId: string; className?: string }) {
  const checked = useSyncExternalStore(
    subscribeCompare,
    () => getCompareSnapshot().includes(listingId),
    () => getServerCompareSnapshot().includes(listingId),
  );

  return (
    <label
      className={`flex cursor-pointer items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggleCompareId(listingId)}
        className="h-3.5 w-3.5 accent-current text-brand"
      />
      Compare
    </label>
  );
}
