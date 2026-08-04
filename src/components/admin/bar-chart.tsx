import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "./section-card";

export type ChartPoint = { label: string; value: number };

/** Reusable vertical time-series bar chart (listings/day, users/month) — plain CSS
 * flex bars rather than a charting library or hand-rolled SVG, so it's naturally
 * responsive (bars are percentage-height flex children) and needs no client JS beyond
 * the Tooltip on hover/focus. `labelEvery` thins the x-axis labels so a 30-bar chart
 * doesn't overlap its own text. */
export function BarChart({ data, labelEvery = 1, height = 160 }: { data: ChartPoint[]; labelEvery?: number; height?: number }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <EmptyState>No data yet.</EmptyState>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="w-full">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => (
          <Tooltip key={i} content={`${d.label}: ${d.value.toLocaleString("en-PK")}`}>
            <div tabIndex={0} className="group/bar flex min-w-[4px] flex-1 flex-col items-center justify-end outline-none">
              <div
                className="w-full rounded-t-sm bg-brand-soft transition-colors duration-200 group-hover/bar:bg-brand"
                style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
              />
            </div>
          </Tooltip>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="min-w-[4px] flex-1 truncate text-center text-[10px] text-muted">
            {i % labelEvery === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
