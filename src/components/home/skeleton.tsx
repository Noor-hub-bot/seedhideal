// Shared loading-skeleton primitives for homepage sections streamed behind
// <Suspense>. Dimensions are matched to the real content each fallback stands
// in for, to avoid layout shift when the real section swaps in.
import type { ReactNode } from "react";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-neutral-chip ${className}`} />;
}

export function SkeletonGrid({ tiles = 6 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: tiles }).map((_, i) => (
        <SkeletonBlock key={i} className="h-24" />
      ))}
    </div>
  );
}

export function SkeletonRail({ cards = 4 }: { cards?: number }) {
  return (
    <div className="flex gap-6 overflow-hidden">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonBlock key={i} className="h-[280px] w-[280px] shrink-0" />
      ))}
    </div>
  );
}

export function SkeletonBand({ className = "h-40" }: { className?: string }) {
  return <SkeletonBlock className={`${className} w-full`} />;
}

// Wraps a fallback in the same container every real section uses, so the
// swap from skeleton to content doesn't shift surrounding layout.
export function SkeletonSection({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-6 py-14">{children}</div>;
}
