import { count, desc, gte } from "drizzle-orm";
import { db, listings, users } from "@/db";

export type ChartPoint = { label: string; value: number };

const DAY_LABEL = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" });
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** Listings created per day, last 30 days. Every day in the window is present
 * (zero-filled) rather than only days with a real submission, so the chart reads as
 * one continuous timeline instead of gapped bars. */
export async function getListingsPerDay(): Promise<ChartPoint[]> {
  const since = daysAgo(29);
  const rows = await db.select({ createdAt: listings.createdAt }).from(listings).where(gte(listings.createdAt, since));

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(dateKey(r.createdAt), (counts.get(dateKey(r.createdAt)) ?? 0) + 1);

  const points: ChartPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = daysAgo(i);
    points.push({ label: DAY_LABEL.format(d), value: counts.get(dateKey(d)) ?? 0 });
  }
  return points;
}

/** Users registered per month, last 12 months — zero-filled the same way. */
export async function getUsersPerMonth(): Promise<ChartPoint[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(1);
  since.setMonth(since.getMonth() - 11);

  const rows = await db.select({ createdAt: users.createdAt }).from(users).where(gte(users.createdAt, since));

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(monthKey(r.createdAt), (counts.get(monthKey(r.createdAt)) ?? 0) + 1);

  const points: ChartPoint[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < 12; i++) {
    points.push({ label: MONTH_NAMES[cursor.getMonth()], value: counts.get(monthKey(cursor)) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points;
}

/** Most popular car brands across every listing ever created (not just currently
 * active) — a broader, longer-lived marketplace-activity signal than the homepage's
 * BrandGrid, which intentionally only counts live inventory. */
export async function getTopBrands(limit = 8): Promise<ChartPoint[]> {
  return db
    .select({ label: listings.make, value: count() })
    .from(listings)
    .groupBy(listings.make)
    .orderBy(desc(count()))
    .limit(limit);
}

export async function getListingsByCity(limit = 8): Promise<ChartPoint[]> {
  return db
    .select({ label: listings.city, value: count() })
    .from(listings)
    .groupBy(listings.city)
    .orderBy(desc(count()))
    .limit(limit);
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  correction: "Correction",
  active: "Active",
  paused: "Paused",
  suspended: "Suspended",
  sold: "Sold",
  expired: "Expired",
  closed: "Closed",
};

export async function getListingStatusDistribution(): Promise<ChartPoint[]> {
  const rows = await db
    .select({ status: listings.status, value: count() })
    .from(listings)
    .groupBy(listings.status)
    .orderBy(desc(count()));
  return rows.map((r) => ({ label: STATUS_LABELS[r.status] ?? r.status, value: r.value }));
}
