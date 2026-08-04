import Link from "next/link";
import type { ComponentType } from "react";
import { ClipboardIcon, PlusIcon, StarIcon, UsersIcon, VerificationIcon } from "@/components/home/icons";
import { FlagIcon, GearIcon } from "./icons";

const ACTIONS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/sell", label: "Add Listing", icon: PlusIcon },
  { href: "/admin/moderation", label: "Review Pending Listings", icon: ClipboardIcon },
  { href: "/admin/users", label: "Manage Users", icon: UsersIcon },
  { href: "/admin/moderation#featured", label: "Featured Listings", icon: StarIcon },
  { href: "/admin/moderation#verification", label: "Verification Center", icon: VerificationIcon },
  { href: "/admin/moderation#reports", label: "Reports", icon: FlagIcon },
  { href: "/admin/settings", label: "Site Settings", icon: GearIcon },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-soft hover:shadow-lg"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-ink transition-transform duration-300 group-hover:scale-110">
            <a.icon className="h-5 w-5" />
          </div>
          <span className="text-[13px] font-semibold leading-tight">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
