import { and, count, countDistinct, desc, eq, inArray, isNotNull, lt } from "drizzle-orm";
import {
  db,
  favorites,
  inquiries,
  listingBoosts,
  listingPhotos,
  listings,
  reports,
  reviews,
  users,
  verificationCases,
} from "@/db";

export type HealthMetric = { key: string; label: string; value: number; caption?: string };

/**
 * Every number here is a live count — the same queries (or the same tables) the
 * moderation queue and per-seller analytics already use, just totalled marketplace-wide.
 * "Failed Uploads" has no real signal in this schema (no upload-attempt log table) and
 * a schema change is out of scope for a dashboard — shown as untracked rather than a
 * fabricated 0.
 */
export async function getMarketplaceHealth(): Promise<(HealthMetric | { key: string; label: string; value: null; caption: string })[]> {
  const [
    [pendingReviewsRow],
    [reportedRow],
    [verificationRow],
    [unreadRow],
    [photosRow],
  ] = await Promise.all([
    db.select({ n: count() }).from(reviews).where(eq(reviews.status, "pending")),
    db
      .select({ n: countDistinct(reports.listingId) })
      .from(reports)
      .where(and(isNotNull(reports.listingId), inArray(reports.status, ["new", "triaged", "investigating"]))),
    db.select({ n: count() }).from(verificationCases).where(eq(verificationCases.status, "pending")),
    // No read/unread tracking exists on `messages` — the closest real analog is an
    // inquiry that hasn't been responded to yet.
    db.select({ n: count() }).from(inquiries).where(eq(inquiries.status, "sent")),
    db.select({ n: count() }).from(listingPhotos),
  ]);

  return [
    { key: "pendingReviews", label: "Pending Reviews", value: pendingReviewsRow.n, caption: "Customer reviews awaiting approval" },
    { key: "reportedListings", label: "Reported Listings", value: reportedRow.n, caption: "Listings with an open report" },
    { key: "verificationRequests", label: "Verification Requests", value: verificationRow.n, caption: "Awaiting identity/ownership review" },
    { key: "unreadMessages", label: "Unread Messages", value: unreadRow.n, caption: "Inquiries awaiting a reply" },
    { key: "failedUploads", label: "Failed Uploads", value: null, caption: "Not tracked yet" },
    { key: "storageUsage", label: "Storage Usage", value: photosRow.n, caption: "Photos stored" },
  ];
}

export type ListingLeaderboardEntry = { id: string; title: string; value: number };
export type SellerLeaderboardEntry = { id: string; name: string; value: number };

export async function getMostViewedListings(limit = 5): Promise<ListingLeaderboardEntry[]> {
  const rows = await db
    .select({ id: listings.id, make: listings.make, model: listings.model, year: listings.year, viewCount: listings.viewCount })
    .from(listings)
    .orderBy(desc(listings.viewCount))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, title: `${r.make} ${r.model} ${r.year}`, value: r.viewCount }));
}

export async function getMostFavoritedListings(limit = 5): Promise<ListingLeaderboardEntry[]> {
  const rows = await db
    .select({ id: listings.id, make: listings.make, model: listings.model, year: listings.year, total: count(favorites.userId) })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .groupBy(listings.id)
    .orderBy(desc(count(favorites.userId)))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, title: `${r.make} ${r.model} ${r.year}`, value: r.total }));
}

export async function getMostContactedSellers(limit = 5): Promise<SellerLeaderboardEntry[]> {
  const rows = await db
    .select({ id: users.id, name: users.displayName, phone: users.phone, total: count(inquiries.id) })
    .from(inquiries)
    .innerJoin(listings, eq(inquiries.listingId, listings.id))
    .innerJoin(users, eq(listings.sellerId, users.id))
    .groupBy(users.id)
    .orderBy(desc(count(inquiries.id)))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, name: r.name ?? r.phone ?? "Unnamed seller", value: r.total }));
}

export type SystemStatusItem = { key: string; label: string; status: "healthy" | "warning" | "down"; detail: string };

const storageConfigured = !!(process.env.STORAGE_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
const emailConfigured = !!process.env.RESEND_API_KEY;

/**
 * Every status is a real signal, not a hardcoded "all green":
 * - Database: a live query against it, wrapped so a real outage shows red.
 * - Storage / Image Upload: whether real S3 credentials are configured (vs. this
 *   app's local-disk dev fallback) — the same condition src/lib/storage.ts itself
 *   uses to decide which path to take.
 * - Authentication: this page only renders after requireStaff() succeeds, so a
 *   broken auth system would never reach here — a true, if tautological, signal.
 * - Background Jobs: derived from whether the sweep-listings/sweep-boosts cron jobs
 *   are keeping up — any listing/boost still marked active past its own expiresAt
 *   means the sweep hasn't run recently (same condition those routes themselves sweep on).
 */
export async function getSystemStatus(): Promise<SystemStatusItem[]> {
  const [dbHealthy, staleListings, staleBoosts] = await Promise.all([
    db
      .select({ n: count() })
      .from(users)
      .limit(1)
      .then(() => true)
      .catch(() => false),
    db
      .select({ n: count() })
      .from(listings)
      .where(and(eq(listings.status, "active"), lt(listings.expiresAt, new Date())))
      .then(([r]) => r.n)
      .catch(() => 0),
    db
      .select({ n: count() })
      .from(listingBoosts)
      .where(and(eq(listingBoosts.status, "active"), lt(listingBoosts.expiresAt, new Date())))
      .then(([r]) => r.n)
      .catch(() => 0),
  ]);

  const staleTotal = staleListings + staleBoosts;

  return [
    {
      key: "database",
      label: "Database",
      status: dbHealthy ? "healthy" : "down",
      detail: dbHealthy ? "Connected" : "Unreachable",
    },
    {
      key: "storage",
      label: "Storage",
      status: storageConfigured ? "healthy" : "warning",
      detail: storageConfigured ? "Object storage configured" : "Using local disk (dev mode)",
    },
    { key: "authentication", label: "Authentication", status: "healthy", detail: "Session verified for this request" },
    {
      key: "emailService",
      label: "Email Service",
      status: emailConfigured ? "healthy" : "warning",
      detail: emailConfigured ? "Resend configured" : "Not configured",
    },
    {
      key: "imageUpload",
      label: "Image Upload",
      status: storageConfigured ? "healthy" : "warning",
      detail: storageConfigured ? "Object storage configured" : "Using local disk (dev mode)",
    },
    {
      key: "backgroundJobs",
      label: "Background Jobs",
      status: staleTotal === 0 ? "healthy" : "warning",
      detail: staleTotal === 0 ? "Sweep jobs up to date" : `${staleTotal} item${staleTotal === 1 ? "" : "s"} overdue for sweep`,
    },
  ];
}
