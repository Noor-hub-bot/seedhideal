import { EmptyState } from "./section-card";

export type ChartPoint = { label: string; value: number };

/** Reusable horizontal ranked list (top brands, top cities, performance leaderboards)
 * — each row is a label, a value, and a proportional bar relative to the top entry. */
export function RankedBarList({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) return <EmptyState>No data yet.</EmptyState>;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-3.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
            <span className="truncate font-medium">{d.label}</span>
            <span className="shrink-0 text-muted">{d.value.toLocaleString("en-PK")}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-chip">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-soft-ink to-brand transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
