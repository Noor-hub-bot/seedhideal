"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { getReportDetail, type ReportDetail } from "@/lib/admin/reports";
import {
  addInternalNoteAsStaff,
  recordReportCrossAction,
  sendWarningAsStaff,
  updateReportStatusAsStaff,
  type ReportActionResult,
} from "@/lib/admin/report-mutations";
import { deleteListingAsStaff, suspendListingAsStaff } from "@/lib/admin/listing-mutations";
import { setUserStatusAsStaff } from "@/lib/admin/user-mutations";

/** Loaded on demand when the drawer opens, not pre-fetched per queue row — same
 * "heavy data only on open" pattern as getVerificationCaseDetailAction/getListingDetailAction. */
export async function getReportDetailAction(reportId: string): Promise<ReportDetail | null> {
  await requireStaff();
  return getReportDetail(reportId);
}

function revalidateReportPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/reports");
}

export async function markUnderReviewAction(reportId: string): Promise<ReportActionResult> {
  const staff = await requireStaff();
  const result = await updateReportStatusAsStaff(staff.id, reportId, "investigating");
  if (result.ok) revalidateReportPages();
  return result;
}

export async function resolveReportAction(reportId: string): Promise<ReportActionResult> {
  const staff = await requireStaff();
  const result = await updateReportStatusAsStaff(staff.id, reportId, "actioned");
  if (result.ok) revalidateReportPages();
  return result;
}

export async function dismissReportAction(reportId: string): Promise<ReportActionResult> {
  const staff = await requireStaff();
  const result = await updateReportStatusAsStaff(staff.id, reportId, "closed");
  if (result.ok) revalidateReportPages();
  return result;
}

export async function addInternalNoteAction(reportId: string, note: string): Promise<ReportActionResult> {
  const staff = await requireStaff();
  const result = await addInternalNoteAsStaff(staff.id, reportId, note);
  if (result.ok) revalidateReportPages();
  return result;
}

export async function sendWarningAction(reportId: string, userId: string, message: string): Promise<ReportActionResult> {
  const staff = await requireStaff();
  const result = await sendWarningAsStaff(staff.id, reportId, userId, message);
  if (result.ok) revalidateReportPages();
  return result;
}

export async function suspendReportedListingAction(reportId: string, listingId: string, reason?: string): Promise<ReportActionResult> {
  const staff = await requireStaff();
  const result = await suspendListingAsStaff(staff.id, listingId, reason);
  if (result.ok) {
    await recordReportCrossAction(staff.id, reportId, "listing_suspended", `Suspended reported listing (${listingId}).`);
    revalidateReportPages();
    revalidatePath("/admin/listings");
  }
  return result;
}

export async function suspendReportedUserAction(reportId: string, userId: string): Promise<ReportActionResult> {
  const staff = await requireStaff();
  const result = await setUserStatusAsStaff(staff.id, userId, "restricted", "suspend");
  if (result.ok) {
    await recordReportCrossAction(staff.id, reportId, "user_suspended", `Suspended reported user (${userId}).`);
    revalidateReportPages();
    revalidatePath("/admin/users");
  }
  return result;
}

export async function deleteReportedListingAction(reportId: string, listingId: string): Promise<ReportActionResult> {
  const staff = await requireStaff();
  const result = await deleteListingAsStaff(staff.id, listingId);
  if (result.ok) {
    await recordReportCrossAction(staff.id, reportId, "listing_deleted", `Deleted reported listing (${listingId}).`);
    revalidateReportPages();
    revalidatePath("/admin/listings");
  }
  return result;
}
