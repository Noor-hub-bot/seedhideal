import type { ComponentType } from "react";
import type { SystemStatusItem } from "@/lib/admin/health";
import { BuildingIcon, CloudIcon, DatabaseIcon, ImageIcon, KeyIcon, MailIcon } from "./icons";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  database: DatabaseIcon,
  storage: CloudIcon,
  authentication: KeyIcon,
  emailService: MailIcon,
  imageUpload: ImageIcon,
  backgroundJobs: BuildingIcon,
};

const DOT_TONE: Record<SystemStatusItem["status"], string> = {
  healthy: "bg-brand",
  warning: "bg-gold",
  down: "bg-alert",
};

export function SystemStatus({ items }: { items: SystemStatusItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = ICONS[item.key] ?? DatabaseIcon;
        return (
          <div key={item.key} className="flex items-start gap-3 rounded-input border border-border p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-chip text-muted">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_TONE[item.status]}`} />
                <span className="truncate text-[13px] font-semibold">{item.label}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted">{item.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
