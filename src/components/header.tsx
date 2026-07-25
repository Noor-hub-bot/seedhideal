import Link from "next/link";
import { getSessionUser, isStaff } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { ButtonLink } from "@/components/ui";
import { HeaderLogo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { CITIES } from "@/lib/constants";

const navLink =
  "text-[15px] font-medium text-muted transition-colors hover:text-foreground";

export async function Header() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-10">
          <Link href="/" aria-label="SeedhiDeal home">
            <HeaderLogo />
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            <Link href="/cars" className={navLink}>
              Browse Cars
            </Link>
            <Link href="/dealers" className={navLink}>
              Dealers
            </Link>
            <Link href="/sell" className={navLink}>
              Sell Car
            </Link>
            <Link href="/#how-it-works" className={navLink}>
              How It Works
            </Link>
            <Link href="/help" className={navLink}>
              Help
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ButtonLink href="/sell" className="hidden px-[22px] py-[11px] lg:inline-flex">
            Post Your Car
          </ButtonLink>
          {user ? (
            <>
              <Link href="/dashboard/favorites" className={`hidden ${navLink} lg:block`}>
                Saved
              </Link>
              <Link href="/dashboard" className={`hidden ${navLink} text-foreground lg:block`}>
                Dashboard
              </Link>
              {isStaff(user) && (
                <Link href="/admin" className={`hidden ${navLink} lg:block`}>
                  Admin
                </Link>
              )}
              <form action={signOutAction} className="hidden lg:block">
                <button type="submit" className={`${navLink} cursor-pointer font-semibold`}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/signin"
              className="hidden text-[15px] font-semibold text-foreground lg:block"
            >
              Login / Sign up
            </Link>
          )}
          <MobileNav signedIn={!!user} isStaffUser={isStaff(user)} signOutAction={signOutAction} />
        </div>
      </div>

      <div className="border-t border-border">
        <form
          action="/cars"
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3"
        >
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-input border border-border-input bg-surface px-4 py-2.5">
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-muted"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              name="q"
              placeholder="Search by make, model or location"
              className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-input border border-border-input bg-surface px-4 py-2.5 text-[15px] text-foreground">
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-muted"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 18s6-5.2 6-9.6A6 6 0 1 0 4 8.4C4 12.8 10 18 10 18Z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle cx="10" cy="8.2" r="2.1" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <select
              name="city"
              defaultValue=""
              className="bg-transparent focus:outline-none"
            >
              <option value="">All Pakistan</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="sr-only">
            Search
          </button>
        </form>
      </div>
    </header>
  );
}
