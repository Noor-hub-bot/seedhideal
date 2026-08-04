// Core staff report-moderation logic — deliberately NOT a "use server" file (same
// reasoning as user-mutations.ts/listing-mutations.ts/verification-mutations.ts: every
// exported async function in a "use server" file becomes its own client-callable RPC
// endpoint, so the requireStaff() auth check has to live in the "use server" wrappers,
// not here). src/lib/actions/reports.ts's updateReportStatusAction delegates to
// updateReportStatusAsStaff after requireStaff() passes, rather than a second copy of
// the update+audit-log+notify logic — Suspend Listing/Suspend User/Delete Listing reuse
// the existing listing-mutations.ts/user-mutations.ts core functions directly instead
// of a third implementation of any of those.
import { eq } from "drizzle-orm";
import { auditLog, db, reports } from "@/db";
import { notify } from "@/lib/notify";

export type ReportActionResult = { ok: true; message: string } | { ok: false; error: string };
export type ReportStatus = "triaged" | "investigating" | "actioned" | "closed";

const VALID_STATUSES = new Set<ReportStatus>(["triaged", "investigating", "actioned", "closed"]);

/** Status vocabulary note: this schema's report_status enum has no separate
 * "resolved"/"dismissed" values — "actioned" (real corrective action was taken) is
 * Resolved, and "closed" (reviewed, no action needed) is Dismissed. Both real,
 * existing enum values; nothing added. */
export async function updateReportStatusAsStaff(staffId: string, reportId: string, status: ReportStatus): Promise<ReportActionResult> {
  if (!VALID_STATUSES.has(status)) return { ok: false, error: "Not a valid status." };

  const [existing] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!existing) return { ok: false, error: "Report not found." };
  if (existing.status === status) return { ok: true, message: `Report is already ${status}.` };

  await db.update(reports).set({ status }).where(eq(reports.id, reportId));
  await db.insert(auditLog).values({
    actorId: staffId,
    objectType: "report",
    objectId: reportId,
    action: "status_updated",
    priorState: existing.status,
    newState: status,
  });

  if (status === "actioned" || status === "closed") {
    await notify({
      userId: existing.reporterId,
      type: "report_reviewed",
      title: "Your report has been reviewed",
      body: "Thanks for flagging this — our team has looked into it.",
    });
  }

  return { ok: true, message: `Report marked ${status === "actioned" ? "resolved" : status === "closed" ? "dismissed" : status}.` };
}

/** Staff-only notes on a report — reuses audit_log (already never shown to end users
 * anywhere in the app) instead of a new notes table/column, tagged with a distinct
 * action so the drawer's combined history timeline can label it "Internal note" rather
 * than a real status change. */
export async function addInternalNoteAsStaff(staffId: string, reportId: string, note: string): Promise<ReportActionResult> {
  const trimmed = note.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty." };

  const [existing] = await db.select({ id: reports.id }).from(reports).where(eq(reports.id, reportId));
  if (!existing) return { ok: false, error: "Report not found." };

  await db.insert(auditLog).values({ actorId: staffId, objectType: "report", objectId: reportId, action: "internal_note", reason: trimmed });
  return { ok: true, message: "Note added." };
}

/** Sends a warning notification through the existing notify() channel — no separate
 * "warnings" mechanism exists or is needed, this is exactly what notifications already
 * do — and records it on the report's audit trail. */
export async function sendWarningAsStaff(staffId: string, reportId: string, userId: string, message: string): Promise<ReportActionResult> {
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: "A warning message is required." };

  const [existing] = await db.select({ id: reports.id }).from(reports).where(eq(reports.id, reportId));
  if (!existing) return { ok: false, error: "Report not found." };

  await notify({ userId, type: "moderation_warning", title: "Warning from SeedhiDeal", body: trimmed });
  await db.insert(auditLog).values({ actorId: staffId, objectType: "report", objectId: reportId, action: "warning_sent", reason: trimmed });

  return { ok: true, message: "Warning sent." };
}

/** Suspend Listing / Suspend User / Delete Listing reuse listing-mutations.ts's and
 * user-mutations.ts's existing staff functions directly (no third implementation) —
 * this just leaves a breadcrumb on the report's own history timeline so the drawer's
 * combined audit view shows "listing suspended" even though the real state change and
 * its own audit_log row live under objectType "listing"/"user". */
export async function recordReportCrossAction(staffId: string, reportId: string, action: string, detail: string): Promise<void> {
  await db.insert(auditLog).values({ actorId: staffId, objectType: "report", objectId: reportId, action, reason: detail });
}
