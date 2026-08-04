// Admin-dashboard loading skeletons, matching each real section's footprint so the
// swap from skeleton to content doesn't shift surrounding layout — same convention as
// src/components/home/skeleton.tsx.

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-input bg-neutral-chip ${className}`} />;
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Block key={i} className="h-[132px] rounded-2xl" />
      ))}
    </div>
  );
}

export function SectionSkeleton({ height = "h-64" }: { height?: string }) {
  return <Block className={`${height} w-full rounded-2xl`} />;
}

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Block key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
