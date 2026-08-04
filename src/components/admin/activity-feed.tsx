import type { ActivityEntry } from "@/lib/admin/activity";
import { EmptyState } from "./section-card";

/** Reusable activity-row renderer — one row per audit_log entry, newest first, with a
 * human-readable relative time (see getRecentActivity / formatRelativeTime). */
export function ActivityFeed({ items }: { items: ActivityEntry[] }) {
  if (items.length === 0) return <EmptyState>No activity recorded yet.</EmptyState>;

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-input px-2 py-2.5 text-[13px] transition-colors hover:bg-background"
        >
          <span className="leading-snug">{item.text}</span>
          <span className="shrink-0 whitespace-nowrap text-[12px] text-muted">{item.time}</span>
        </li>
      ))}
    </ul>
  );
}
