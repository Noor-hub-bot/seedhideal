import { EmptyState } from "./section-card";

export type ChartPoint = { label: string; value: number };

// Cycles through existing design-system color tokens rather than introducing new
// arbitrary colors — covers up to 10 categories (the listing_status enum's full size).
const PALETTE = [
  "var(--brand)",
  "var(--gold)",
  "var(--alert)",
  "var(--brand-soft-ink)",
  "var(--gold-ink)",
  "var(--alert-ink)",
  "var(--muted)",
  "var(--brand-strong)",
  "var(--gold-deep)",
  "var(--border-input)",
];

/** Reusable donut chart for parts-of-a-whole breakdowns (listing status distribution)
 * — a CSS conic-gradient ring plus a legend, no charting library or SVG path math. */
export function DonutChart({ data }: { data: ChartPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <EmptyState>No data yet.</EmptyState>;

  // A plain running total in a for loop, not a closure inside .map(), so the react
  // compiler doesn't mistake this render-local accumulation for state mutation.
  const stops: string[] = [];
  let cumulative = 0;
  for (let i = 0; i < data.length; i++) {
    const start = (cumulative / total) * 360;
    cumulative += data[i].value;
    const end = (cumulative / total) * 360;
    stops.push(`${PALETTE[i % PALETTE.length]} ${start}deg ${end}deg`);
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div
        className="relative h-36 w-36 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
      >
        <div className="absolute inset-[22%] rounded-full bg-surface" />
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 truncate">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="shrink-0 font-medium text-muted">{d.value.toLocaleString("en-PK")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
