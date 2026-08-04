import type { ComponentType } from "react";
import { TrendDownIcon, TrendUpIcon } from "./icons";

/** One of the 8 top-of-dashboard summary cards. Every prop here comes straight from a
 * live database count (see src/lib/admin/stats.ts) — nothing in this component is
 * itself a data source. */
export function StatCard({
  icon: Icon,
  label,
  value,
  todayChange,
  percentChange,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  todayChange: number;
  percentChange: number;
}) {
  const isUp = percentChange >= 0;
  const TrendIcon = isUp ? TrendUpIcon : TrendDownIcon;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-brand-soft-ink to-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-soft to-surface text-brand-soft-ink transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
            isUp ? "bg-brand-soft text-brand-soft-ink" : "bg-alert-soft text-alert-ink"
          }`}
        >
          <TrendIcon className="h-3 w-3" />
          {Math.abs(percentChange)}%
        </span>
      </div>

      <div className="font-display text-[28px] font-medium leading-none">{value.toLocaleString("en-PK")}</div>
      <div className="mt-1.5 text-[13px] font-medium text-muted">{label}</div>

      <div className="mt-3 border-t border-border pt-2.5 text-[12px] text-muted">
        <span className="font-semibold text-foreground">+{todayChange.toLocaleString("en-PK")}</span> today
      </div>
    </div>
  );
}
