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
    return (
      <main id="main-content" className="flex-1">
        {children}
      </main>
    );
  }

  return (
    <>
      {/* Visually hidden until focused — lets keyboard users bypass the header
          nav/search bar instead of tabbing through every link on every page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-brand focus:px-4 focus:py-2.5 focus:text-[15px] focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      {header}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {footer}
      {compareTray}
    </>
  );
}
