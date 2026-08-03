import { unstable_cache } from "next/cache";
import { and, count, countDistinct, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db, listings } from "@/db";
import { Heading } from "@/components/ui";
import { safeSection } from "@/lib/safe-section";
import { getVerifiedSellerIds } from "./trust-band";
import { CarIcon, MapPinIcon, UsersIcon, VerificationIcon } from "./icons";
import { CountUpNumber } from "./count-up-number";

const STAT_ICONS: Record<string, typeof CarIcon> = {
  "Cars listed": CarIcon,
  Sellers: UsersIcon,
  Cities: MapPinIcon,
  "Verified listings": VerificationIcon,
};

// Not personalized — safe to cache for 60s, same rationale as BrandGrid.
const getStats = unstable_cache(
  async () => {
    const activeCondition = and(
      eq(listings.status, "active"),
      or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
    );

    const [[carsRow], [sellersRow], [citiesRow], verifiedIds] = await Promise.all([
      db.select({ total: count() }).from(listings).where(activeCondition),
      db.select({ total: countDistinct(listings.sellerId) }).from(listings).where(activeCondition),
      db.select({ total: countDistinct(listings.city) }).from(listings).where(activeCondition),
      getVerifiedSellerIds(),
    ]);

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
  },
  ["home-statistics-band"],
  { revalidate: 60 },
);

export async function StatisticsBand() {
  const stats = await safeSection(getStats, null);

  if (!stats) return null;

  return (
    <section className="border-y border-border bg-neutral-chip/50 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Heading as="h2" size="md" className="mb-3 text-center">
          SeedhiDeal in numbers
        </Heading>
        <p className="mx-auto mb-12 max-w-[480px] text-center text-muted">
          Real activity from a verified marketplace.
        </p>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = STAT_ICONS[s.label] ?? CarIcon;
            return (
              <div
                key={s.label}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-brand-soft-ink to-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-soft to-surface text-brand-soft-ink transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="font-display text-[32px] font-medium leading-none sm:text-[40px]">
                  <CountUpNumber value={s.value} />
                </div>
                <div className="mt-2.5 text-[13px] font-medium text-muted">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
