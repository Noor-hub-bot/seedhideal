"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// The (auth) screens (src/app/(auth)/*) are full-bleed, chrome-free per the
// reference design — no site header/footer/compare-tray. Root layout.tsx still
// renders Header/Footer/CompareTray as Server Components and passes them in here;
// this client wrapper only decides whether to show them, keeping every other
// route (40+ pages) unaffected.
const AUTH_ROUTE_PREFIXES = [
  "/welcome",
  "/sign-in",
  "/sign-up",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/complete-profile",
  "/account-created",
  "/google-bridge",
];

export function SiteChrome({
  header,
  footer,
  compareTray,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  compareTray: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthRoute) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
      {compareTray}
    </>
  );
}
