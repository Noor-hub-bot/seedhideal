import type { ReactNode } from "react";

/** Shared card shell for every dashboard widget (activity feed, pending approvals,
 * recent users, charts, health, performance, system status) — one place for the
 * title/description/action header layout instead of each widget re-implementing it. */
export function SectionCard({
  title,
  description,
  action,
  className = "",
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-6 shadow-sm ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-input border border-dashed border-border bg-background py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}
