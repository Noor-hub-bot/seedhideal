import { and, count, countDistinct, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db, listings, verificationCases } from "@/db";
import { Heading } from "@/components/ui";
import { safeSection } from "@/lib/safe-section";

export async function StatisticsBand() {
  const stats = await safeSection(async () => {
    const activeCondition = and(
      eq(listings.status, "active"),
      or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
    );

    const [[carsRow], [sellersRow], [citiesRow], verifiedCases] = await Promise.all([
      db.select({ total: count() }).from(listings).where(activeCondition),
      db.select({ total: countDistinct(listings.sellerId) }).from(listings).where(activeCondition),
      db.select({ total: countDistinct(listings.city) }).from(listings).where(activeCondition),
      db.select({ userId: verificationCases.userId }).from(verificationCases).where(eq(verificationCases.status, "verified")),
    ]);

    const verifiedIds = [...new Set(verifiedCases.map((r) => r.userId))];
    const [verifiedListingsRow] = verifiedIds.length
      ? await db
          .select({ total: count() })
          .from(listings)
          .where(and(activeCondition, inArray(listings.sellerId, verifiedIds)))
      : [{ total: 0 }];

    return [
      { label: "Cars listed", value: carsRow.total },
      { label: "Sellers", value: sellersRow.total },
      { label: "Cities", value: citiesRow.total },
      { label: "Verified listings", value: verifiedListingsRow.total },
    ];
  }, null);

  if (!stats) return null;

  return (
    <section className="border-y border-border bg-surface px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Heading as="h2" size="md" className="mb-10 text-center">
          SeedhiDeal in numbers
        </Heading>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-[36px] font-medium">{s.value}</div>
              <div className="mt-1 text-[13px] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
