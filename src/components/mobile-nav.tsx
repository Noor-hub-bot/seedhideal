"use client";

import { useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { HeaderSearchForm } from "@/components/header-search";

const navLink =
  "block py-2 text-[15px] font-medium text-muted transition-colors hover:text-foreground";

export function MobileNav({
  signedIn,
  isStaffUser,
  signOutAction,
}: {
  signedIn: boolean;
  isStaffUser: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-control text-foreground transition-colors hover:bg-neutral-chip"
      >
        {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 border-t border-border bg-surface px-6 py-5 shadow-md">
          <nav className="mb-5 flex flex-col">
            <Link href="/cars" className={navLink} onClick={close}>
              Browse Cars
            </Link>
            <Link href="/dealers" className={navLink} onClick={close}>
              Dealers
            </Link>
            <Link href="/sell" className={navLink} onClick={close}>
              Sell Car
            </Link>
            <Link href="/#how-it-works" className={navLink} onClick={close}>
              How It Works
            </Link>
            <Link href="/help" className={navLink} onClick={close}>
              Help
            </Link>
            {signedIn && (
              <Link href="/dashboard/favorites" className={navLink} onClick={close}>
                Saved
              </Link>
            )}
            {signedIn && (
              <Link href="/dashboard" className={`${navLink} text-foreground`} onClick={close}>
                Dashboard
              </Link>
            )}
            {signedIn && (
              <Link href="/dashboard/support" className={navLink} onClick={close}>
                Support
              </Link>
            )}
            {signedIn && isStaffUser && (
              <Link href="/admin" className={navLink} onClick={close}>
                Admin
              </Link>
            )}
          </nav>

          <HeaderSearchForm className="mb-5" />

          <div className="flex flex-col gap-3">
            <ButtonLink href="/sell" className="shadow-sm" onClick={close}>
              Post Your Car
            </ButtonLink>
            {signedIn ? (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full text-left text-[15px] font-semibold text-foreground"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/signin"
                className="text-[15px] font-semibold text-foreground"
                onClick={close}
              >
                Login / Sign up
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
