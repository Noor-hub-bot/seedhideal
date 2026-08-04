// Core staff verification-decision logic — deliberately NOT a "use server" file (same
// reasoning as src/lib/admin/user-mutations.ts and listing-mutations.ts: every exported
// async function in a "use server" file becomes its own client-callable RPC endpoint,
// so the requireStaff() auth check has to live in the "use server" wrappers, not here).
// src/lib/actions/verification.ts's decideVerification (used by the existing
// approve/reject/request-resubmission actions) delegates to this after requireStaff()
// passes, rather than a second copy of the update+audit-log+notify logic.
import { eq } from "drizzle-orm";
import { auditLog, db, verificationCases } from "@/db";
import { notify } from "@/lib/notify";

export type VerificationDecision = "verified" | "rejected" | "action_required";
export type DecideVerificationResult = { ok: true } | { ok: false; error: string };

export async function decideVerificationAsStaff(
  staffId: string,
  caseId: string,
  status: VerificationDecision,
  reason: string,
): Promise<DecideVerificationResult> {
  const trimmedReason = reason.trim();
  if ((status === "rejected" || status === "action_required") && !trimmedReason) {
    return { ok: false, error: "A reason is required." };
  }

  const [existingCase] = await db.select().from(verificationCases).where(eq(verificationCases.id, caseId));
  if (!existingCase) return { ok: false, error: "Verification case not found." };
  if (existingCase.status !== "pending") return { ok: false, error: `This case is already ${existingCase.status}.` };
  // A staff member must never be able to decide their own verification case (e.g. a
  // staff account that's also listing as a dealer).
  if (existingCase.userId === staffId) return { ok: false, error: "You cannot review your own verification case." };

  await db
    .update(verificationCases)
    .set({
      status,
      reviewerId: staffId,
      reviewerNote: trimmedReason || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(verificationCases.id, caseId));

  await db.insert(auditLog).values({
    actorId: staffId,
    objectType: "verification_case",
    objectId: caseId,
    action: status === "verified" ? "approved" : status === "rejected" ? "rejected" : "resubmission_requested",
    priorState: existingCase.status,
    newState: status,
    reason: trimmedReason || null,
  });

  await notify({
    userId: existingCase.userId,
    type: status === "verified" ? "verification_approved" : status === "rejected" ? "verification_rejected" : "verification_resubmission_requested",
    title:
      status === "verified"
        ? "You're a verified owner"
        : status === "rejected"
          ? "Verification needs another look"
          : "Please resubmit your verification documents",
    body: trimmedReason || undefined,
    href: "/dashboard/verify",
  });

  return { ok: true };
}
