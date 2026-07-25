"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  clearCompare,
  getCompareSnapshot,
  getServerCompareSnapshot,
  subscribeCompare,
} from "@/lib/compare-storage";

export function CompareTray() {
  const ids = useSyncExternalStore(subscribeCompare, getCompareSnapshot, getServerCompareSnapshot);

  if (ids.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-6 py-3 shadow-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {ids.length} car{ids.length === 1 ? "" : "s"} selected to compare
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={clearCompare}
            className="text-[13px] font-semibold text-muted hover:text-foreground"
          >
            Clear
          </button>
          {ids.length >= 2 ? (
            <Link
              href={`/compare?ids=${ids.join(",")}`}
              className="rounded-control bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-strong"
            >
              Compare
            </Link>
          ) : (
            <span className="text-[13px] text-muted">Select 1 more to compare</span>
          )}
        </div>
      </div>
    </div>
  );
}
