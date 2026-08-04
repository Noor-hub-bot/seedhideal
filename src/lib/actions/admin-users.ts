"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { approveVerificationAction, rejectVerificationAction } from "@/lib/actions/verification";
import { changeUserRoleAsStaff, setUserStatusAsStaff, verifyPendingCase, type UserActionResult } from "@/lib/admin/user-mutations";

export type { UserActionResult };

function revalidateUserPages(userId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function suspendUserAction(userId: string): Promise<UserActionResult> {
  const staff = await requireStaff();
  const result = await setUserStatusAsStaff(staff.id, userId, "restricted", "suspend");
  if (result.ok) revalidateUserPages(userId);
  return result;
}

export async function activateUserAction(userId: string): Promise<UserActionResult> {
  const staff = await requireStaff();
  const result = await setUserStatusAsStaff(staff.id, userId, "active", "activate");
  if (result.ok) revalidateUserPages(userId);
  return result;
}

/** A real hard DELETE would violate foreign-key constraints (listings.sellerId,
 * sessions.userId, reviews.authorId, and a dozen other NOT NULL references to
 * users.id all have no ON DELETE rule) and would destroy the audit trail this whole
 * admin section relies on. "Delete" here is the strongest state this schema already
 * has — deactivated — plus an immediate session revoke, not a schema change. */
export async function deleteUserAction(userId: string): Promise<UserActionResult> {
  const staff = await requireStaff();
  const result = await setUserStatusAsStaff(staff.id, userId, "deactivated", "delete");
  if (result.ok) revalidateUserPages(userId);
  return result;
}

export async function changeUserRoleAction(userId: string, role: string): Promise<UserActionResult> {
  const staff = await requireStaff();
  const result = await changeUserRoleAsStaff(staff.id, userId, role);
  if (result.ok) revalidateUserPages(userId);
  return result;
}

/** Thin wrappers so the admin user-management UI can approve/reject a user's
 * verification case without duplicating decideVerification's mutation logic — they
 * just adapt the (userId) call shape to the existing (formData) actions. Both existing
 * actions return void unconditionally (even a no-op silently succeeds, since their only
 * caller today is a plain <form> that doesn't check a return value), so verifyPendingCase
 * checks first to report a real error instead of a false "success". */
export async function verifyUserAction(caseId: string): Promise<UserActionResult> {
  await requireStaff();
  const check = await verifyPendingCase(caseId);
  if (!check.ok) return check;

  const formData = new FormData();
  formData.set("caseId", caseId);
  await approveVerificationAction(formData);
  return { ok: true, message: "User verified." };
}

export async function rejectUserVerificationAction(caseId: string, reason: string): Promise<UserActionResult> {
  await requireStaff();
  if (!reason.trim()) return { ok: false, error: "A reason is required." };
  const check = await verifyPendingCase(caseId);
  if (!check.ok) return check;

  const formData = new FormData();
  formData.set("caseId", caseId);
  formData.set("reason", reason);
  await rejectVerificationAction(formData);
  return { ok: true, message: "Verification rejected." };
}
