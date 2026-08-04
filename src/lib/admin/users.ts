import { and, count, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db, listings, users, verificationCases } from "@/db";

export type UserSummary = {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  role: string;
  status: string;
  listingCount: number;
  verificationStatus: "verified" | "pending" | "none";
  /** The verificationCases row id to approve/reject, when verificationStatus is
   * "pending" — null otherwise. Lets the UI call the existing approve/reject actions
   * without a second lookup. */
  pendingVerificationCaseId: string | null;
};

export type UserRole = "user" | "reviewer" | "moderator" | "support" | "admin";
export type UserAccountStatus = "active" | "restricted" | "deactivated";
export type UserSortKey = "newest" | "oldest" | "name" | "listings";

export type UserDirectoryFilters = {
  search?: string;
  role?: UserRole;
  status?: UserAccountStatus;
  verification?: "verified" | "pending" | "none";
  sort?: UserSortKey;
};

function baseCondition(filters: UserDirectoryFilters): SQL | undefined {
  const clauses: SQL[] = [];
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    const searchClause = or(ilike(users.displayName, term), ilike(users.email, term), ilike(users.phone, term));
    if (searchClause) clauses.push(searchClause);
  }
  if (filters.role) clauses.push(eq(users.role, filters.role));
  if (filters.status) clauses.push(eq(users.status, filters.status));
  return clauses.length ? and(...clauses) : undefined;
}

/**
 * Fetches every user matching the real-column filters (search/role/status), attaches
 * listing count and verification status (both derived from other tables, so they're
 * computed here rather than filtered in SQL), then applies the verification filter and
 * sort/pagination in JS. Correct at this app's scale (tens–hundreds of users, not
 * millions) without needing a correlated subquery for a derived value.
 */
async function loadDirectory(filters: UserDirectoryFilters): Promise<UserSummary[]> {
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(baseCondition(filters));

  if (rows.length === 0) return [];
  const userIds = rows.map((r) => r.id);

  const [listingCountRows, verificationRows] = await Promise.all([
    db
      .select({ sellerId: listings.sellerId, total: count() })
      .from(listings)
      .where(inArray(listings.sellerId, userIds))
      .groupBy(listings.sellerId),
    db
      .select({ id: verificationCases.id, userId: verificationCases.userId, status: verificationCases.status })
      .from(verificationCases)
      .where(inArray(verificationCases.userId, userIds)),
  ]);

  const listingCountByUser = new Map(listingCountRows.map((r) => [r.sellerId, r.total]));
  const verificationByUser = new Map<string, "verified" | "pending" | "none">();
  const pendingCaseByUser = new Map<string, string>();
  for (const v of verificationRows) {
    const current = verificationByUser.get(v.userId) ?? "none";
    if (v.status === "verified") verificationByUser.set(v.userId, "verified");
    else if (v.status === "pending" && current !== "verified") {
      verificationByUser.set(v.userId, "pending");
      pendingCaseByUser.set(v.userId, v.id);
    }
  }

  let combined: UserSummary[] = rows.map((r) => ({
    ...r,
    listingCount: listingCountByUser.get(r.id) ?? 0,
    verificationStatus: verificationByUser.get(r.id) ?? "none",
    pendingVerificationCaseId: pendingCaseByUser.get(r.id) ?? null,
  }));

  if (filters.verification) combined = combined.filter((u) => u.verificationStatus === filters.verification);

  combined.sort((a, b) => {
    switch (filters.sort) {
      case "oldest":
        return a.createdAt.getTime() - b.createdAt.getTime();
      case "name":
        return (a.displayName ?? "").localeCompare(b.displayName ?? "");
      case "listings":
        return b.listingCount - a.listingCount;
      case "newest":
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  return combined;
}

/**
 * Shared user-directory query — powers both the dashboard's "Recent Users" widget
 * (small limit, no filters) and the full /admin/users directory (filters, sort,
 * pagination), so the two never carry two copies of the same join logic.
 */
export async function getUserSummaries(
  opts: { limit?: number; offset?: number } & UserDirectoryFilters = {},
): Promise<UserSummary[]> {
  const { limit = 8, offset = 0, ...filters } = opts;
  const all = await loadDirectory(filters);
  return all.slice(offset, offset + limit);
}

/** Total count matching the same filters as getUserSummaries, for pagination — kept as
 * a separate call so the existing dashboard widget's getUserSummaries call is untouched
 * (it never needed a total). */
export async function getUserCount(filters: UserDirectoryFilters = {}): Promise<number> {
  const all = await loadDirectory(filters);
  return all.length;
}

export async function getUserStats(): Promise<{ total: number; active: number; restricted: number; deactivated: number; verified: number }> {
  const [[totalRow], [activeRow], [restrictedRow], [deactivatedRow], verifiedRows] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(users).where(eq(users.status, "active")),
    db.select({ n: count() }).from(users).where(eq(users.status, "restricted")),
    db.select({ n: count() }).from(users).where(eq(users.status, "deactivated")),
    db.select({ userId: verificationCases.userId }).from(verificationCases).where(eq(verificationCases.status, "verified")),
  ]);
  return {
    total: totalRow.n,
    active: activeRow.n,
    restricted: restrictedRow.n,
    deactivated: deactivatedRow.n,
    verified: new Set(verifiedRows.map((r) => r.userId)).size,
  };
}

