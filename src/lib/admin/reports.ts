import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { auditLog, db, listingPhotos, listings, reports, users } from "@/db";

export type ReportPriority = "high" | "medium" | "low";

/** Priority isn't a stored column — this schema's reports table has none, and adding
 * one isn't necessary when the report's own category already implies urgency. Derived
 * deterministically from real data (the reporter's chosen category), not fabricated per
 * report: safety/fraud categories rank High, listing-accuracy concerns Medium, cosmetic
 * disputes Low. */
const PRIORITY_BY_CATEGORY: Record<string, ReportPriority> = {
  scam_request: "high",
  harassment: "high",
  fake_listing: "medium",
  dealer_mislabeling: "medium",
  ownership_concern: "medium",
  incorrect_condition: "low",
};
const PRIORITY_RANK: Record<ReportPriority, number> = { high: 3, medium: 2, low: 1 };

export function reportPriority(category: string): ReportPriority {
  return PRIORITY_BY_CATEGORY[category] ?? "medium";
}

export type ReportSummary = {
  id: string;
  category: string;
  status: string;
  priority: ReportPriority;
  detail: string | null;
  createdAt: Date;
  reporterId: string;
  reporterName: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;
  type: "listing" | "user";
  listingId: string | null;
  listingTitle: string | null;
  reportedUserId: string | null;
  reportedUserName: string | null;
};

export type ReportSortKey = "newest" | "oldest" | "priority";

export type ReportFilters = {
  search?: string;
  status?: string;
  category?: string;
  type?: "listing" | "user";
  priority?: ReportPriority;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: ReportSortKey;
};

const reportedUsers = alias(users, "reported_users_admin");

function baseCondition(filters: ReportFilters): SQL | undefined {
  const clauses: SQL[] = [];

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    const like = `%${term}%`;
    const searchClauses = [
      ilike(users.displayName, like),
      ilike(users.email, like),
      ilike(users.phone, like),
      ilike(reportedUsers.displayName, like),
      ilike(reportedUsers.email, like),
      ilike(reportedUsers.phone, like),
    ];
    if (/^[0-9a-f-]+$/i.test(term)) {
      searchClauses.push(sql`${reports.id}::text ilike ${like}`, sql`${reports.listingId}::text ilike ${like}`);
    }
    const combined = or(...searchClauses);
    if (combined) clauses.push(combined);
  }

  if (filters.status) clauses.push(eq(reports.status, filters.status as (typeof reports.status.enumValues)[number]));
  if (filters.category) clauses.push(eq(reports.category, filters.category as (typeof reports.category.enumValues)[number]));
  if (filters.dateFrom) clauses.push(gte(reports.createdAt, filters.dateFrom));
  if (filters.dateTo) clauses.push(lte(reports.createdAt, filters.dateTo));

  return clauses.length ? and(...clauses) : undefined;
}

async function loadQueue(filters: ReportFilters): Promise<ReportSummary[]> {
  const rows = await db
    .select({
      id: reports.id,
      category: reports.category,
      status: reports.status,
      detail: reports.detail,
      createdAt: reports.createdAt,
      reporterId: reports.reporterId,
      reporterName: users.displayName,
      reporterEmail: users.email,
      reporterPhone: users.phone,
      listingId: reports.listingId,
      listingMake: listings.make,
      listingModel: listings.model,
      listingYear: listings.year,
      reportedUserId: reports.reportedUserId,
      reportedUserName: reportedUsers.displayName,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .leftJoin(listings, eq(reports.listingId, listings.id))
    .leftJoin(reportedUsers, eq(reports.reportedUserId, reportedUsers.id))
    .where(baseCondition(filters));

  let combined: ReportSummary[] = rows.map((r) => ({
    id: r.id,
    category: r.category,
    status: r.status,
    priority: reportPriority(r.category),
    detail: r.detail,
    createdAt: r.createdAt,
    reporterId: r.reporterId,
    reporterName: r.reporterName,
    reporterEmail: r.reporterEmail,
    reporterPhone: r.reporterPhone,
    type: r.listingId ? "listing" : "user",
    listingId: r.listingId,
    listingTitle: r.listingId ? `${r.listingMake} ${r.listingModel} ${r.listingYear}` : null,
    reportedUserId: r.reportedUserId,
    reportedUserName: r.reportedUserName,
  }));

  // type and priority are both derived (not real columns), so — same as verification
  // status / userType elsewhere — they're filtered here rather than in SQL.
  if (filters.type) combined = combined.filter((r) => r.type === filters.type);
  if (filters.priority) combined = combined.filter((r) => r.priority === filters.priority);

  combined.sort((a, b) => {
    if (filters.sort === "priority") return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.createdAt.getTime() - a.createdAt.getTime();
    if (filters.sort === "oldest") return a.createdAt.getTime() - b.createdAt.getTime();
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return combined;
}

export async function getReportsQueue(opts: { limit?: number; offset?: number } & ReportFilters = {}): Promise<ReportSummary[]> {
  const { limit = 20, offset = 0, ...filters } = opts;
  const all = await loadQueue(filters);
  return all.slice(offset, offset + limit);
}

export async function getReportsQueueCount(filters: ReportFilters = {}): Promise<number> {
  const all = await loadQueue(filters);
  return all.length;
}

export async function getReportStats(): Promise<{
  total: number;
  open: number;
  underReview: number;
  resolved: number;
  dismissed: number;
  reportsToday: number;
}> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [[totalRow], newRows, triagedRows, appealedRows, investigatingRows, actionedRows, closedRows, todayRows] = await Promise.all([
    db.select({ n: count() }).from(reports),
    db.select({ n: count() }).from(reports).where(eq(reports.status, "new")),
    db.select({ n: count() }).from(reports).where(eq(reports.status, "triaged")),
    // "appealed" (reopened after a decision) has no dedicated card in this dashboard —
    // it's counted as Open since it needs a fresh look, same as "new"/"triaged".
    db.select({ n: count() }).from(reports).where(eq(reports.status, "appealed")),
    db.select({ n: count() }).from(reports).where(eq(reports.status, "investigating")),
    db.select({ n: count() }).from(reports).where(eq(reports.status, "actioned")),
    db.select({ n: count() }).from(reports).where(eq(reports.status, "closed")),
    db.select({ n: count() }).from(reports).where(gte(reports.createdAt, startOfToday)),
  ]);

  return {
    total: totalRow.n,
    open: newRows[0].n + triagedRows[0].n + appealedRows[0].n,
    underReview: investigatingRows[0].n,
    resolved: actionedRows[0].n,
    dismissed: closedRows[0].n,
    reportsToday: todayRows[0].n,
  };
}

export type ReportDetail = {
  id: string;
  category: string;
  status: string;
  priority: ReportPriority;
  detail: string | null;
  createdAt: Date;
  reporter: { id: string; name: string | null; email: string | null; phone: string | null };
  reportedUser: { id: string; name: string | null; email: string | null; phone: string | null; status: string } | null;
  listing: {
    id: string;
    title: string;
    status: string;
    city: string;
    priceRpk: number;
    sellerId: string;
    sellerName: string | null;
    photos: string[];
  } | null;
  previousReports: { id: string; category: string; status: string; createdAt: Date; reporterName: string | null }[];
  history: { id: string; action: string; actorName: string | null; reason: string | null; priorState: string | null; newState: string | null; createdAt: Date }[];
};

export async function getReportDetail(reportId: string): Promise<ReportDetail | null> {
  const [row] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!row) return null;

  const [reporter] = await db.select().from(users).where(eq(users.id, row.reporterId));

  const [reportedUserRow, listingRow] = await Promise.all([
    row.reportedUserId ? db.select().from(users).where(eq(users.id, row.reportedUserId)) : Promise.resolve([]),
    row.listingId ? db.select().from(listings).where(eq(listings.id, row.listingId)) : Promise.resolve([]),
  ]);
  const reportedUser = reportedUserRow[0];
  const listing = listingRow[0];

  const [photoRows, sellerRow] = listing
    ? await Promise.all([
        db.select({ storageKey: listingPhotos.storageKey }).from(listingPhotos).where(eq(listingPhotos.listingId, listing.id)).orderBy(asc(listingPhotos.sortOrder)),
        db.select({ id: users.id, name: users.displayName }).from(users).where(eq(users.id, listing.sellerId)),
      ])
    : [[], []];

  // Previous reports for the same listing or same reported user (excluding this one) —
  // real signal for "is this a repeat offender", not a new query concept, just this
  // same reports table filtered differently.
  const previousReportRows = await db
    .select({ report: reports, reporterName: users.displayName })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(
      row.listingId
        ? eq(reports.listingId, row.listingId)
        : row.reportedUserId
          ? eq(reports.reportedUserId, row.reportedUserId)
          : eq(reports.id, reportId), // no listing/user to compare against — matches only itself, filtered out below
    );

  const historyRows = await db
    .select({ log: auditLog, actorName: users.displayName })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(eq(auditLog.objectId, reportId));
  historyRows.sort((a, b) => b.log.createdAt.getTime() - a.log.createdAt.getTime());

  return {
    id: row.id,
    category: row.category,
    status: row.status,
    priority: reportPriority(row.category),
    detail: row.detail,
    createdAt: row.createdAt,
    reporter: { id: reporter.id, name: reporter.displayName, email: reporter.email, phone: reporter.phone },
    reportedUser: reportedUser ? { id: reportedUser.id, name: reportedUser.displayName, email: reportedUser.email, phone: reportedUser.phone, status: reportedUser.status } : null,
    listing: listing
      ? {
          id: listing.id,
          title: `${listing.make} ${listing.model}${listing.variant ? ` ${listing.variant}` : ""}, ${listing.year}`,
          status: listing.status,
          city: listing.city,
          priceRpk: listing.askingPricePkr,
          sellerId: listing.sellerId,
          sellerName: sellerRow[0]?.name ?? null,
          photos: photoRows.map((p) => p.storageKey),
        }
      : null,
    previousReports: previousReportRows
      .filter((r) => r.report.id !== reportId)
      .map((r) => ({ id: r.report.id, category: r.report.category, status: r.report.status, createdAt: r.report.createdAt, reporterName: r.reporterName })),
    history: historyRows.map((h) => ({
      id: h.log.id,
      action: h.log.action,
      actorName: h.actorName,
      reason: h.log.reason,
      priorState: h.log.priorState,
      newState: h.log.newState,
      createdAt: h.log.createdAt,
    })),
  };
}
