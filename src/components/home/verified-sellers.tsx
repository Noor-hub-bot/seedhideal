import Link from "next/link";
import { and, count, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db, listings, users, verificationCases } from "@/db";
import { Card } from "@/components/ui";
import { SectionHeading } from "./section-heading";
import { safeSection } from "@/lib/safe-section";

// No seller-profile pages exist in this app, so this isn't a mini-directory —
// a real-data trust band: how many verified sellers there are, plus a
// handful of them and how many active listings they each have.
export async function VerifiedSellers() {
  const data = await safeSection(async () => {
    const verifiedCases = await db
      .select({ userId: verificationCases.userId })
      .from(verificationCases)
      .where(eq(verificationCases.status, "verified"));
    const verifiedIds = [...new Set(verifiedCases.map((r) => r.userId))];
    if (verifiedIds.length === 0) return null;

    const activeCondition = and(
      eq(listings.status, "active"),
      or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
    );

    const [sellers, rows] = await Promise.all([
      db
        .select({ id: users.id, displayName: users.displayName, city: users.city })
        .from(users)
        .where(inArray(users.id, verifiedIds)),
      db
        .select({ sellerId: listings.sellerId, total: count() })
        .from(listings)
        .where(and(activeCondition, inArray(listings.sellerId, verifiedIds)))
        .groupBy(listings.sellerId)
        .orderBy(desc(count())),
    ]);
    const listingCountBySeller = new Map(rows.map((r) => [r.sellerId, r.total]));
    const featured = sellers
      .filter((s) => (listingCountBySeller.get(s.id) ?? 0) > 0)
      .sort((a, b) => (listingCountBySeller.get(b.id) ?? 0) - (listingCountBySeller.get(a.id) ?? 0))
      .slice(0, 6);

    return { verifiedCount: verifiedIds.length, featured, listingCountBySeller };
  }, null);

  if (!data) return null;
  const { verifiedCount, featured, listingCountBySeller } = data;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading
        title="Verified sellers"
        subtitle={`${verifiedCount} seller${verifiedCount === 1 ? "" : "s"} have confirmed their identity and ownership`}
        seeAllHref="/cars?verified=1"
      />
      {featured.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {featured.map((s) => (
            <Link key={s.id} href="/cars?verified=1">
              <Card className="flex flex-col items-center gap-1.5 px-4 py-6 text-center transition-shadow hover:shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft font-display text-lg font-medium text-brand-soft-ink">
                  {(s.displayName ?? "S").charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-semibold">{s.displayName ?? "Verified seller"}</span>
                <span className="text-[12px] text-muted">
                  {s.city ?? "Pakistan"} · {listingCountBySeller.get(s.id) ?? 0} listing
                  {(listingCountBySeller.get(s.id) ?? 0) === 1 ? "" : "s"}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
