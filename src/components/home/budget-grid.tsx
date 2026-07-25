import Link from "next/link";
import { and, count, eq, gt, gte, isNull, lte, or } from "drizzle-orm";
import { db, listings } from "@/db";
import { Card } from "@/components/ui";
import { SectionHeading } from "./section-heading";
import { BUDGET_BUCKETS } from "@/lib/constants";
import { safeSection } from "@/lib/safe-section";

export async function BudgetGrid() {
  const activeCondition = and(
    eq(listings.status, "active"),
    or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
  );

  const counts = await safeSection(
    () =>
      Promise.all(
        BUDGET_BUCKETS.map((b) => {
          const bounds = [
            b.min !== undefined ? gte(listings.askingPricePkr, b.min) : undefined,
            b.max !== undefined ? lte(listings.askingPricePkr, b.max) : undefined,
          ].filter((c): c is NonNullable<typeof c> => !!c);
          return db
            .select({ total: count() })
            .from(listings)
            .where(and(activeCondition, ...bounds));
        }),
      ),
    null,
  );
  if (!counts) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading title="Browse by budget" seeAllHref="/cars" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {BUDGET_BUCKETS.map((b, i) => {
          const sp = new URLSearchParams();
          if (b.min !== undefined) sp.set("priceMin", String(b.min));
          if (b.max !== undefined) sp.set("priceMax", String(b.max));
          const total = counts[i][0].total;
          return (
            <Link key={b.label} href={`/cars?${sp.toString()}`}>
              <Card className="flex flex-col gap-1 px-4 py-6 text-center transition-shadow hover:shadow-sm">
                <span className="text-sm font-semibold">{b.label}</span>
                <span className="text-[12px] text-muted">
                  {total} listing{total === 1 ? "" : "s"}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
