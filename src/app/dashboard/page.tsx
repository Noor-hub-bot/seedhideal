import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import {
  db,
  favorites,
  listings,
  notifications,
  recentlyViewed,
  reviews,
  savedSearches,
  verificationCases,
} from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Card, Heading } from "@/components/ui";
import { VerificationCard } from "@/components/dashboard/verification-card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardOverviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard");

  const [
    [latestVerification],
    [{ activeListings }],
    [{ savedCount }],
    [{ searchCount }],
    [{ viewedCount }],
    [{ unreadCount }],
    [{ reviewCount }],
  ] = await Promise.all([
    db
      .select()
      .from(verificationCases)
      .where(eq(verificationCases.userId, user.id))
      .orderBy(desc(verificationCases.createdAt))
      .limit(1),
    db
      .select({ activeListings: count() })
      .from(listings)
      .where(and(eq(listings.sellerId, user.id), eq(listings.status, "active"))),
    db.select({ savedCount: count() }).from(favorites).where(eq(favorites.userId, user.id)),
    db.select({ searchCount: count() }).from(savedSearches).where(eq(savedSearches.userId, user.id)),
    db.select({ viewedCount: count() }).from(recentlyViewed).where(eq(recentlyViewed.userId, user.id)),
    db
      .select({ unreadCount: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
    db.select({ reviewCount: count() }).from(reviews).where(eq(reviews.authorId, user.id)),
  ]);

  const profileIncomplete = !user.displayName || !user.city;

  const tiles = [
    { href: "/dashboard/listings", label: "Active listings", value: activeListings },
    { href: "/dashboard/favorites", label: "Saved listings", value: savedCount },
    { href: "/dashboard/searches", label: "Saved searches", value: searchCount },
    { href: "/dashboard/recently-viewed", label: "Recently viewed", value: viewedCount },
    { href: "/dashboard/notifications", label: "Unread notifications", value: unreadCount },
    { href: "/dashboard/reviews", label: "Reviews written", value: reviewCount },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10">
      <div className="mb-6">
        <h1 className="font-display text-[32px] font-medium leading-tight">
          Salaam{user.displayName ? `, ${user.displayName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Signed in as {user.phone} — your number is never shown to other users.
        </p>
      </div>

      <VerificationCard verification={latestVerification} />

      {profileIncomplete && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">
            <span className="font-semibold">Complete your profile</span> — add your display
            name and city so buyers and sellers know who they&apos;re dealing with.
          </p>
          <Link
            href="/dashboard/profile"
            className="text-[13px] font-semibold text-brand hover:text-brand-strong"
          >
            Complete now →
          </Link>
        </Card>
      )}

      <Heading as="h2" size="md" className="mb-4 mt-8">
        Overview
      </Heading>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="p-5 transition-shadow hover:shadow-sm">
              <div className="font-display text-[28px] font-medium">{t.value}</div>
              <div className="mt-1 text-[13px] text-muted">{t.label}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
