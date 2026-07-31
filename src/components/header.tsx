import Link from "next/link";
import { getSessionUser, isStaff } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { ButtonLink } from "@/components/ui";
import { HeaderLogo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";
import { SearchBar } from "@/components/search-bar";

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
            <NavLink href="/cars" className={navLink}>
              Browse Cars
            </NavLink>
            <NavLink href="/dealers" className={navLink}>
              Dealers
            </NavLink>
            <NavLink href="/sell" className={navLink}>
              Sell Car
            </NavLink>
            <Link href="/#how-it-works" className={navLink}>
              How It Works
            </Link>
            <NavLink href="/help" className={navLink}>
              Help
            </NavLink>
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
              href="/sign-in"
              className="hidden text-[15px] font-semibold text-foreground lg:block"
            >
              Login / Sign up
            </Link>
          )}
          <MobileNav signedIn={!!user} isStaffUser={isStaff(user)} signOutAction={signOutAction} />
        </div>
      </div>

      <div className="border-t border-border">
        <SearchBar variant="compact" className="mx-auto max-w-6xl px-6 py-3" />
      </div>
    </header>
  );
}
