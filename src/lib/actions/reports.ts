"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auditLog, db, reports } from "@/db";
import { getSessionUser, requireStaff } from "@/lib/auth";
import { notify } from "@/lib/notify";

const CATEGORIES = new Set([
  "fake_listing",
  "ownership_concern",
  "dealer_mislabeling",
  "scam_request",
  "harassment",
  "incorrect_condition",
]);

export type ReportFormState = { error?: string; sent?: boolean };

export async function submitReportAction(
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in to report a concern." };

  const listingId = String(formData.get("listingId") ?? "").trim() || null;
  const reportedUserId = String(formData.get("reportedUserId") ?? "").trim() || null;
  if (!listingId && !reportedUserId) return { error: "Nothing to report." };

  const category = String(formData.get("category") ?? "");
  if (!CATEGORIES.has(category)) return { error: "Choose a reason." };

  const detail = String(formData.get("detail") ?? "").trim();
  if (detail.length > 2000) return { error: "Details are too long." };

  await db.insert(reports).values({
    reporterId: user.id,
    listingId,
    reportedUserId,
    category: category as
      | "fake_listing"
      | "ownership_concern"
      | "dealer_mislabeling"
      | "scam_request"
      | "harassment"
      | "incorrect_condition",
    detail: detail || null,
  });

  return { sent: true };
}

const REPORT_STATUSES = new Set(["triaged", "investigating", "actioned", "closed"]);

export async function updateReportStatusAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const reportId = String(formData.get("reportId"));
  const status = String(formData.get("status"));
  if (!REPORT_STATUSES.has(status)) return;

  const [existing] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!existing) return;

  await db
    .update(reports)
    .set({ status: status as "triaged" | "investigating" | "actioned" | "closed" })
    .where(eq(reports.id, reportId));

  await db.insert(auditLog).values({
    actorId: staff.id,
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

  revalidatePath("/admin");
}
