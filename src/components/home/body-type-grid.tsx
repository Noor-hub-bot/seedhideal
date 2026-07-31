import Link from "next/link";
import { unstable_cache } from "next/cache";
import { and, count, eq, gt, isNull, or } from "drizzle-orm";
import { db, listings } from "@/db";
import { Card } from "@/components/ui";
import { BODY_TYPES } from "@/lib/constants";
import { safeSection } from "@/lib/safe-section";

// Not personalized — safe to cache for 60s, same rationale as BrandGrid.
const getBodyTypeCounts = unstable_cache(
  async () =>
    db
      .select({ bodyType: listings.bodyType, total: count() })
      .from(listings)
      .where(
        and(
          eq(listings.status, "active"),
          or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
        ),
      )
      .groupBy(listings.bodyType),
  ["home-body-type-grid"],
  { revalidate: 60 },
);

export async function BodyTypeGrid() {
  const rows = await safeSection(getBodyTypeCounts, []);
  if (rows.length === 0) return null;
  const countByType = new Map(rows.map((r) => [r.bodyType, r.total]));

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
      {BODY_TYPES.map((type) => (
        <Link key={type} href={`/cars?bodyType=${encodeURIComponent(type)}`}>
          <Card className="flex flex-col items-center gap-1 px-3 py-6 text-center transition-shadow hover:shadow-sm">
            <BodyTypeIcon className="mb-1 h-6 w-6 text-muted" />
            <span className="text-sm font-semibold">{type}</span>
            <span className="text-[12px] text-muted">
              {countByType.get(type) ?? 0} listing{(countByType.get(type) ?? 0) === 1 ? "" : "s"}
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function BodyTypeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13" />
      <path d="M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  );
}
