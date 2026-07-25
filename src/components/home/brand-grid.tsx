import Link from "next/link";
import { and, count, eq, gt, isNull, or } from "drizzle-orm";
import { db, listings } from "@/db";
import { Card } from "@/components/ui";
import { SectionHeading } from "./section-heading";
import { MAKES } from "@/lib/constants";
import { safeSection } from "@/lib/safe-section";

// No real brand-logo assets exist in this project, and sourcing third-party
// trademarked logos isn't something to do casually — rendered as clean text
// tiles instead, consistent with the calm/editorial brand voice.
export async function BrandGrid() {
  const rows = await safeSection(
    () =>
      db
        .select({ make: listings.make, total: count() })
        .from(listings)
        .where(
          and(
            eq(listings.status, "active"),
            or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
          ),
        )
        .groupBy(listings.make),
    [],
  );
  if (rows.length === 0) return null;
  const countByMake = new Map(rows.map((r) => [r.make, r.total]));

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading title="Browse by brand" seeAllHref="/cars" />
      <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {MAKES.map((make) => (
          <Link key={make} href={`/cars?make=${encodeURIComponent(make)}`} className="shrink-0">
            <Card className="flex w-[140px] flex-col items-center gap-1 px-4 py-6 text-center transition-shadow hover:shadow-sm sm:w-auto">
              <span className="font-display text-lg font-medium">{make}</span>
              <span className="text-[13px] text-muted">
                {countByMake.get(make) ?? 0} listing{(countByMake.get(make) ?? 0) === 1 ? "" : "s"}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
