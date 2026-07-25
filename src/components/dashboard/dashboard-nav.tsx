"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/listings", label: "My Listings" },
  { href: "/dashboard/favorites", label: "Saved" },
  { href: "/dashboard/searches", label: "Saved Searches" },
  { href: "/dashboard/recently-viewed", label: "Recently Viewed" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/profile", label: "Profile" },
];

export function DashboardNav({ isDealer }: { isDealer: boolean }) {
  const pathname = usePathname();
  const tabs = isDealer ? [...TABS, { href: "/dashboard/dealer", label: "Dealer" }] : TABS;

  return (
    <nav className="-mx-6 flex gap-1 overflow-x-auto border-b border-border px-6 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = t.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[14px] font-semibold transition-colors ${
              active
                ? "border-brand text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
