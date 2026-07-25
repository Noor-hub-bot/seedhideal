import Link from "next/link";
import { FooterLogo } from "@/components/logo";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Browse",
    links: [
      { label: "All cars", href: "/cars" },
      { label: "Sell your car", href: "/sell" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Saved cars", href: "/dashboard/favorites" },
      { label: "Sign in", href: "/signin" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help centre", href: "/help" },
      { label: "Write a review", href: "/reviews/new" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <FooterLogo />
            <p className="mt-4 max-w-[220px] text-[13px] leading-relaxed text-muted">
              A trust-first marketplace for verified private-owner cars in Pakistan.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">
                {col.heading}
              </h3>
              <ul className="space-y-2 text-[13px]">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-muted hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 border-t border-border pt-6 text-[13px] text-muted">
          © 2026 SeedhiDeal. Working name — brand and legal checks pending.
        </p>
      </div>
    </footer>
  );
}
