import { and, count, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { auditLog, db, dealerProfiles, listings, users, verificationCases } from "@/db";

export type VerificationCaseSummary = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  userAvatarUrl: string | null;
  userType: "dealer" | "individual";
  status: string;
  relationship: string | null;
  documentCount: number;
  createdAt: Date;
  reviewedAt: Date | null;
};

export type VerificationSortKey = "newest" | "oldest";

export type VerificationFilters = {
  search?: string;
  status?: string;
  userType?: "dealer" | "individual";
  dateFrom?: Date;
  dateTo?: Date;
  sort?: VerificationSortKey;
};

function baseCondition(filters: VerificationFilters): SQL | undefined {
  const clauses: SQL[] = [];

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    const like = `%${term}%`;
    const searchClauses = [ilike(users.displayName, like), ilike(users.email, like), ilike(users.phone, like)];
    // "User ID" search — only tried when the term looks like a UUID (or a prefix of
    // one), same guard the listings search uses for listing ids.
    if (/^[0-9a-f-]+$/i.test(term)) {
      searchClauses.push(sql`${users.id}::text ilike ${like}`);
    }
    const combined = or(...searchClauses);
    if (combined) clauses.push(combined);
  }

  if (filters.status) clauses.push(eq(verificationCases.status, filters.status as (typeof verificationCases.status.enumValues)[number]));
  if (filters.dateFrom) clauses.push(gte(verificationCases.createdAt, filters.dateFrom));
  if (filters.dateTo) clauses.push(lte(verificationCases.createdAt, filters.dateTo));

  return clauses.length ? and(...clauses) : undefined;
}

/** Whether each applicant is a dealer — same "has a profile, or has ever listed as one"
 * rule already established in src/app/dealers/[id]/page.tsx, batched for a set of user
 * ids rather than the single-user query that page does. */
async function loadDealerUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const [profileRows, dealerListingRows] = await Promise.all([
    db.select({ userId: dealerProfiles.userId }).from(dealerProfiles).where(inArray(dealerProfiles.userId, userIds)),
    db
      .selectDistinct({ sellerId: listings.sellerId })
      .from(listings)
      .where(and(inArray(listings.sellerId, userIds), eq(listings.sellerType, "dealer"))),
  ]);
  return new Set([...profileRows.map((r) => r.userId), ...dealerListingRows.map((r) => r.sellerId)]);
}

async function loadQueue(filters: VerificationFilters): Promise<VerificationCaseSummary[]> {
  const rows = await db
    .select({
      id: verificationCases.id,
      userId: verificationCases.userId,
      userName: users.displayName,
      userEmail: users.email,
      userPhone: users.phone,
      userAvatarUrl: users.avatarUrl,
      status: verificationCases.status,
      relationship: verificationCases.relationship,
      identityDocKey: verificationCases.identityDocKey,
      ownershipDocKey: verificationCases.ownershipDocKey,
      createdAt: verificationCases.createdAt,
      reviewedAt: verificationCases.reviewedAt,
    })
    .from(verificationCases)
    .innerJoin(users, eq(verificationCases.userId, users.id))
    .where(baseCondition(filters));

  if (rows.length === 0) return [];

  const dealerUserIds = filters.userType ? await loadDealerUserIds([...new Set(rows.map((r) => r.userId))]) : null;

  let combined: VerificationCaseSummary[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    userPhone: r.userPhone,
    userAvatarUrl: r.userAvatarUrl,
    userType: dealerUserIds?.has(r.userId) ? "dealer" : "individual",
    status: r.status,
    relationship: r.relationship,
    documentCount: [r.identityDocKey, r.ownershipDocKey].filter(Boolean).length,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
  }));

  // userType is derived (not a real column), so — like verification status in
  // src/lib/admin/users.ts — it's resolved above and filtered in JS rather than SQL.
  if (filters.userType) {
    combined = combined.filter((c) => c.userType === filters.userType);
  }

  combined.sort((a, b) => (filters.sort === "oldest" ? a.createdAt.getTime() - b.createdAt.getTime() : b.createdAt.getTime() - a.createdAt.getTime()));

  return combined;
}

export async function getVerificationQueue(opts: { limit?: number; offset?: number } & VerificationFilters = {}): Promise<VerificationCaseSummary[]> {
  const { limit = 20, offset = 0, ...filters } = opts;
  const all = await loadQueue(filters);
  return all.slice(offset, offset + limit);
}

export async function getVerificationQueueCount(filters: VerificationFilters = {}): Promise<number> {
  const all = await loadQueue(filters);
  return all.length;
}

export async function getVerificationStats(): Promise<{
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  totalVerifiedUsers: number;
  totalVerifiedDealers: number;
}> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [[pendingRow], approvedTodayRows, rejectedTodayRows, verifiedRows] = await Promise.all([
    db.select({ n: count() }).from(verificationCases).where(eq(verificationCases.status, "pending")),
    db
      .select({ n: count() })
      .from(verificationCases)
      .where(and(eq(verificationCases.status, "verified"), gte(verificationCases.reviewedAt, startOfToday))),
    db
      .select({ n: count() })
      .from(verificationCases)
      .where(and(eq(verificationCases.status, "rejected"), gte(verificationCases.reviewedAt, startOfToday))),
    db.selectDistinct({ userId: verificationCases.userId }).from(verificationCases).where(eq(verificationCases.status, "verified")),
  ]);

  const verifiedUserIds = verifiedRows.map((r) => r.userId);
  const dealerUserIds = await loadDealerUserIds(verifiedUserIds);

  return {
    pending: pendingRow.n,
    approvedToday: approvedTodayRows[0]?.n ?? 0,
    rejectedToday: rejectedTodayRows[0]?.n ?? 0,
    totalVerifiedUsers: verifiedUserIds.length,
    totalVerifiedDealers: dealerUserIds.size,
  };
}

export type VerificationCaseDetail = {
  id: string;
  status: string;
  relationship: string | null;
  identityDocKey: string | null;
  ownershipDocKey: string | null;
  reviewerNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  applicant: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    city: string | null;
    userType: "dealer" | "individual";
  };
  reviewer: { id: string; name: string | null } | null;
  history: { id: string; action: string; actorName: string | null; reason: string | null; createdAt: Date }[];
};

export async function getVerificationCaseDetail(caseId: string): Promise<VerificationCaseDetail | null> {
  const [row] = await db.select().from(verificationCases).where(eq(verificationCases.id, caseId));
  if (!row) return null;

  const [applicant] = await db.select().from(users).where(eq(users.id, row.userId));
  const reviewer = row.reviewerId ? (await db.select().from(users).where(eq(users.id, row.reviewerId)))[0] : undefined;
  const dealerUserIds = await loadDealerUserIds([row.userId]);

  const historyRows = await db
    .select({ log: auditLog, actorName: users.displayName })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(eq(auditLog.objectId, caseId));
  historyRows.sort((a, b) => b.log.createdAt.getTime() - a.log.createdAt.getTime());

  return {
    id: row.id,
    status: row.status,
    relationship: row.relationship,
    identityDocKey: row.identityDocKey,
    ownershipDocKey: row.ownershipDocKey,
    reviewerNote: row.reviewerNote,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    applicant: {
      id: applicant.id,
      name: applicant.displayName,
      email: applicant.email,
      phone: applicant.phone,
      avatarUrl: applicant.avatarUrl,
      city: applicant.city,
      userType: dealerUserIds.has(row.userId) ? "dealer" : "individual",
    },
    reviewer: reviewer ? { id: reviewer.id, name: reviewer.displayName } : null,
    history: historyRows.map((h) => ({ id: h.log.id, action: h.log.action, actorName: h.actorName, reason: h.log.reason, createdAt: h.log.createdAt })),
  };
}
