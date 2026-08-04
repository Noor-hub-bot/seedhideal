import { and, count, eq, gte, inArray, lt, type AnyColumn, type SQL } from "drizzle-orm";
import { db, dealerProfiles, listingBoosts, listings, users } from "@/db";

type DateColumn = AnyColumn<{ data: Date }>;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/** Percent change vs. 7 days ago, rounded to one decimal. A metric that didn't exist
 * yet 7 days ago (prior === 0) reads as +100% growth if it has any rows now, or flat
 * (0%) if it's still empty — there's no meaningful "percent of zero" otherwise. */
function trend(value: number, today: number, prior: number) {
  const percentChange = prior > 0 ? Math.round(((value - prior) / prior) * 1000) / 10 : value > 0 ? 100 : 0;
  return { value, todayChange: today, percentChange };
}

export type SummaryStat = {
  key: string;
  label: string;
  value: number;
  todayChange: number;
  percentChange: number;
};

/**
 * The 8 top-of-dashboard summary cards — every number is a live count from the
 * database (no cached/derived business metric), with a same-shape trend (today's new
 * rows, and percent change vs. exactly 7 days ago) computed per card against the most
 * meaningful timestamp column for that status. Run as one Promise.all — each is a
 * cheap COUNT, and staff view this page far less often than it needs to be correct.
 */
export async function getSummaryStats(): Promise<SummaryStat[]> {
  const today = startOfToday();
  const weekAgo = daysAgo(7);

  const [
    totalListings,
    activeListings,
    pendingReview,
    rejectedListings,
    soldCars,
    featuredListings,
    totalUsers,
    dealers,
  ] = await Promise.all([
    listingTrend(undefined, listings.createdAt, today, weekAgo),
    listingTrend(eq(listings.status, "active"), listings.approvedAt, today, weekAgo),
    listingTrend(inArray(listings.status, ["submitted", "under_review"]), listings.createdAt, today, weekAgo),
    // "Rejected" — this schema has no separate terminal rejected state; a rejection
    // sends the listing back to the seller as status="correction" with a
    // rejectionReason set (see moderateListingAction). That's the real bucket here.
    listingTrend(eq(listings.status, "correction"), listings.updatedAt, today, weekAgo),
    listingTrend(eq(listings.status, "sold"), listings.soldAt, today, weekAgo),
    // Sourced from listingBoosts (the source of truth the featured cache is derived
    // from — see schema.ts) rather than listings.featured, so total/today/prior all
    // come from one consistent table instead of mixing a cache column with a
    // different table's timestamps.
    boostTrend(today, weekAgo),
    userTrend(undefined, today, weekAgo),
    dealerTrend(today, weekAgo),
  ]);

  return [
    { key: "totalListings", label: "Total Listings", ...totalListings },
    { key: "activeListings", label: "Active Listings", ...activeListings },
    { key: "pendingReview", label: "Pending Review", ...pendingReview },
    { key: "rejectedListings", label: "Rejected Listings", ...rejectedListings },
    { key: "soldCars", label: "Sold Cars", ...soldCars },
    { key: "featuredListings", label: "Featured Listings", ...featuredListings },
    { key: "totalUsers", label: "Total Users", ...totalUsers },
    { key: "dealers", label: "Dealers", ...dealers },
  ];
}

async function listingTrend(condition: SQL | undefined, trendColumn: DateColumn, today: Date, weekAgo: Date) {
  const [[totalRow], [todayRow], [priorRow]] = await Promise.all([
    db.select({ n: count() }).from(listings).where(condition),
    db
      .select({ n: count() })
      .from(listings)
      .where(condition ? and(condition, gte(trendColumn, today)) : gte(trendColumn, today)),
    db
      .select({ n: count() })
      .from(listings)
      .where(condition ? and(condition, lt(trendColumn, weekAgo)) : lt(trendColumn, weekAgo)),
  ]);
  return trend(totalRow.n, todayRow.n, priorRow.n);
}

async function boostTrend(today: Date, weekAgo: Date) {
  const activeCondition = eq(listingBoosts.status, "active");
  const [[totalRow], [todayRow], [priorRow]] = await Promise.all([
    db.select({ n: count() }).from(listingBoosts).where(activeCondition),
    db
      .select({ n: count() })
      .from(listingBoosts)
      .where(and(activeCondition, gte(listingBoosts.reviewedAt, today))),
    db
      .select({ n: count() })
      .from(listingBoosts)
      .where(and(activeCondition, lt(listingBoosts.reviewedAt, weekAgo))),
  ]);
  return trend(totalRow.n, todayRow.n, priorRow.n);
}

async function userTrend(condition: SQL | undefined, today: Date, weekAgo: Date) {
  const [[totalRow], [todayRow], [priorRow]] = await Promise.all([
    db.select({ n: count() }).from(users).where(condition),
    db
      .select({ n: count() })
      .from(users)
      .where(condition ? and(condition, gte(users.createdAt, today)) : gte(users.createdAt, today)),
    db
      .select({ n: count() })
      .from(users)
      .where(condition ? and(condition, lt(users.createdAt, weekAgo)) : lt(users.createdAt, weekAgo)),
  ]);
  return trend(totalRow.n, todayRow.n, priorRow.n);
}

async function dealerTrend(today: Date, weekAgo: Date) {
  const [[totalRow], [todayRow], [priorRow]] = await Promise.all([
    db.select({ n: count() }).from(dealerProfiles),
    db.select({ n: count() }).from(dealerProfiles).where(gte(dealerProfiles.createdAt, today)),
    db.select({ n: count() }).from(dealerProfiles).where(lt(dealerProfiles.createdAt, weekAgo)),
  ]);
  return trend(totalRow.n, todayRow.n, priorRow.n);
}
