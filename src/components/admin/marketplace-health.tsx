import type { HealthMetric } from "@/lib/admin/health";

export function MarketplaceHealth({ metrics }: { metrics: (HealthMetric | { key: string; label: string; value: null; caption: string })[] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m) => (
        <div key={m.key} className="rounded-input border border-border p-4">
          <div className="font-display text-2xl font-medium leading-none">
            {m.value === null ? "—" : m.value.toLocaleString("en-PK")}
          </div>
          <div className="mt-1.5 text-[13px] font-medium">{m.label}</div>
          {m.caption && <div className="mt-0.5 text-[11px] text-muted">{m.caption}</div>}
        </div>
      ))}
    </div>
  );
}
