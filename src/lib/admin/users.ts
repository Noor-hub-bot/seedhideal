import { count, desc, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db, listings, users, verificationCases } from "@/db";

export type UserSummary = {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  listingCount: number;
  verificationStatus: "verified" | "pending" | "none";
};

/**
 * Shared user-directory query — powers both the dashboard's "Recent Users" widget
 * (small limit, no search) and the full /admin/users directory (larger limit, with
 * search), so the two never carry two copies of the same join logic.
 */
export async function getUserSummaries(opts: { limit?: number; search?: string } = {}): Promise<UserSummary[]> {
  const { limit = 8, search } = opts;

  const searchCondition: SQL | undefined = search?.trim()
    ? or(ilike(users.displayName, `%${search.trim()}%`), ilike(users.email, `%${search.trim()}%`), ilike(users.phone, `%${search.trim()}%`))
    : undefined;

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(searchCondition)
    .orderBy(desc(users.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];
  const userIds = rows.map((r) => r.id);

  const [listingCountRows, verificationRows] = await Promise.all([
    db
      .select({ sellerId: listings.sellerId, total: count() })
      .from(listings)
      .where(inArray(listings.sellerId, userIds))
      .groupBy(listings.sellerId),
    db
      .select({ userId: verificationCases.userId, status: verificationCases.status })
      .from(verificationCases)
      .where(inArray(verificationCases.userId, userIds)),
  ]);

  const listingCountByUser = new Map(listingCountRows.map((r) => [r.sellerId, r.total]));
  const verificationByUser = new Map<string, "verified" | "pending" | "none">();
  for (const v of verificationRows) {
    const current = verificationByUser.get(v.userId) ?? "none";
    if (v.status === "verified") verificationByUser.set(v.userId, "verified");
    else if (v.status === "pending" && current !== "verified") verificationByUser.set(v.userId, "pending");
  }

  return rows.map((r) => ({
    ...r,
    listingCount: listingCountByUser.get(r.id) ?? 0,
    verificationStatus: verificationByUser.get(r.id) ?? "none",
  }));
}
