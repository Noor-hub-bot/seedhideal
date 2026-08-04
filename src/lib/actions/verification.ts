"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auditLog, db, verificationCases } from "@/db";
import { getSessionUser, requireStaff } from "@/lib/auth";
import { decideVerificationAsStaff } from "@/lib/admin/verification-mutations";
import {
  ALLOWED_DOC_TYPES,
  MAX_DOC_BYTES,
  detectFileType,
  uploadVerificationDoc,
} from "@/lib/storage";

const RELATIONSHIPS = new Set(["owner", "family", "representative"]);

export type VerificationFormState = { error?: string };

export async function submitVerificationAction(
  _prev: VerificationFormState,
  formData: FormData,
): Promise<VerificationFormState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/verify");

  const relationship = String(formData.get("relationship") ?? "");
  if (!RELATIONSHIPS.has(relationship)) {
    return { error: "Choose your relationship to the vehicle." };
  }

  const identityDoc = formData.get("identityDoc");
  const ownershipDoc = formData.get("ownershipDoc");
  if (!(identityDoc instanceof File) || identityDoc.size === 0) {
    return { error: "Upload your identity document." };
  }
  if (!(ownershipDoc instanceof File) || ownershipDoc.size === 0) {
    return { error: "Upload your ownership document." };
  }
  for (const doc of [identityDoc, ownershipDoc]) {
    if (!ALLOWED_DOC_TYPES.has(doc.type)) {
      return { error: "Documents must be JPG, PNG, WEBP or PDF." };
    }
    if (doc.size > MAX_DOC_BYTES) {
      return { error: "Each document must be under 8MB." };
    }
    const actualType = detectFileType(new Uint8Array(await doc.arrayBuffer()));
    if (actualType !== doc.type) {
      return { error: "One of your documents doesn't look like a valid JPG, PNG, WEBP or PDF file." };
    }
  }

  const identityDocKey = await uploadVerificationDoc(identityDoc, user.id, "identity");
  const ownershipDocKey = await uploadVerificationDoc(ownershipDoc, user.id, "ownership");

  await db.insert(verificationCases).values({
    userId: user.id,
    status: "pending",
    relationship: relationship as "owner" | "family" | "representative",
    identityDocKey,
    ownershipDocKey,
  });

  await db.insert(auditLog).values({
    actorId: user.id,
    objectType: "verification_case",
    objectId: user.id,
    action: "submitted",
    newState: "pending",
  });

  redirect("/dashboard/verify?submitted=1");
}

async function decideVerification(
  formData: FormData,
  status: "verified" | "rejected" | "action_required",
): Promise<void> {
  const staff = await requireStaff();
  const caseId = String(formData.get("caseId"));
  const reason = String(formData.get("reason") ?? "");

  const result = await decideVerificationAsStaff(staff.id, caseId, status, reason);
  if (!result.ok) return;

  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/verification");
}

export async function approveVerificationAction(formData: FormData): Promise<void> {
  await decideVerification(formData, "verified");
}

export async function rejectVerificationAction(formData: FormData): Promise<void> {
  await decideVerification(formData, "rejected");
}

/** Asks the applicant to resubmit documents — a lighter outcome than Reject, using the
 * verification_status enum's existing "action_required" value (already defined in the
 * schema, unused until now) rather than a new column or status. Shares the exact same
 * decision path as approve/reject above, just a third status value. */
export async function requestResubmissionAction(formData: FormData): Promise<void> {
  await decideVerification(formData, "action_required");
}
