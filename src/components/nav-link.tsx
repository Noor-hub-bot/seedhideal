"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

// Thin wrapper around next/link that adds aria-current="page" when the link
// matches the current route. Header stays a Server Component (it awaits
// getSessionUser()) — this is the one piece that needs the current pathname,
// so only it is a Client Component, not the whole header/nav.
export function NavLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return <Link href={href} aria-current={isActive ? "page" : undefined} {...props} />;
}
