import { desc, inArray } from "drizzle-orm";
import { auditLog, db, listings, users } from "@/db";
import { formatRelativeTime } from "@/lib/format";

export type ActivityEntry = {
  id: string;
  text: string;
  time: string;
};

type AuditRow = typeof auditLog.$inferSelect;
type ListingRef = { make: string; model: string };

const LISTING_ACTION_VERBS: Record<string, string> = {
  submitted: "posted",
  edited: "edited",
  deleted: "deleted",
  approved: "approved",
  correction_requested: "requested a correction on",
};

function describe(row: AuditRow, actorName: string | null, listingRef: ListingRef | undefined): string {
  const who = actorName ?? "Someone";
  switch (row.objectType) {
    case "listing": {
      const car = listingRef ? `${listingRef.make} ${listingRef.model}` : "a listing";
      if (row.action === "expired") return `${car} expired`;
      return `${who} ${LISTING_ACTION_VERBS[row.action] ?? row.action.replace(/_/g, " ")} ${car}`;
    }
    case "verification_case":
      if (row.action === "submitted") return `${who} submitted a verification request`;
      if (row.action === "approved") return `${who} approved a verification request`;
      return `${who} rejected a verification request`;
    case "review":
      return row.action === "approved" ? `${who} approved a review` : `${who} rejected a review`;
    case "report":
      return `${who} updated a report to "${row.newState ?? row.action}"`;
    case "support_ticket":
      return `${who} updated a support ticket to "${row.newState ?? row.action}"`;
    case "listing_boost":
      if (row.action === "approved") return `${who} approved a featured listing request`;
      if (row.action === "cancelled") return `${who} ended a featured listing early`;
      return `${who} rejected a featured listing request`;
    case "user":
      return `${who} updated their profile`;
    default:
      return `${who} ${row.action.replace(/_/g, " ")}`;
  }
}

/**
 * The marketplace-wide activity feed — sourced entirely from `audit_log`, which
 * every moderation/listing/verification/review/report/ticket/boost action in this app
 * already writes to (see src/lib/actions/*). Nothing new is logged here; this just
 * reads the existing trail and turns it into a human sentence per row.
 */
export async function getRecentActivity(limit = 12): Promise<ActivityEntry[]> {
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((r) => r.actorId).filter((id): id is string => !!id))];
  const listingIds = [...new Set(rows.filter((r) => r.objectType === "listing").map((r) => r.objectId))];

  const [actorRows, listingRows] = await Promise.all([
    actorIds.length
      ? db.select({ id: users.id, displayName: users.displayName }).from(users).where(inArray(users.id, actorIds))
      : Promise.resolve([]),
    listingIds.length
      ? db.select({ id: listings.id, make: listings.make, model: listings.model }).from(listings).where(inArray(listings.id, listingIds))
      : Promise.resolve([]),
  ]);
  const actorById = new Map(actorRows.map((a) => [a.id, a.displayName]));
  const listingById = new Map(listingRows.map((l) => [l.id, l]));

  return rows.map((r) => ({
    id: r.id,
    text: describe(r, r.actorId ? (actorById.get(r.actorId) ?? null) : null, listingById.get(r.objectId)),
    time: formatRelativeTime(r.createdAt),
  }));
}
