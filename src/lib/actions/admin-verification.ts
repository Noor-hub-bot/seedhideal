"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { decideVerificationAsStaff } from "@/lib/admin/verification-mutations";
import { getVerificationCaseDetail, type VerificationCaseDetail } from "@/lib/admin/verification";

export type VerificationActionResult = { ok: true; message: string } | { ok: false; error: string };

// Same extension→type mapping src/lib/storage.ts uses internally (private there) — kept
// here as a tiny, self-contained lookup rather than exporting storage.ts's whole map
// just for this one display concern (which document type renders as <img> vs <iframe>).
const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

function docTypeFromKey(key: string | null): string | null {
  if (!key) return null;
  const ext = key.split(".").pop() ?? "";
  return TYPE_BY_EXT[ext] ?? null;
}

export type VerificationDocument = { kind: "identity" | "ownership"; label: string; url: string; contentType: string };

export type VerificationCaseDetailWithDocs = VerificationCaseDetail & { documents: VerificationDocument[] };

/** Fetched on demand when the drawer opens (not pre-loaded per queue row) — the
 * "load documents only when requested" requirement. Document URLs point at the
 * existing private /api/verification-docs/[caseId]/[doc] route, which the browser's
 * own session cookie authenticates automatically; nothing here reads document bytes
 * itself. */
export async function getVerificationCaseDetailAction(caseId: string): Promise<VerificationCaseDetailWithDocs | null> {
  await requireStaff();
  const detail = await getVerificationCaseDetail(caseId);
  if (!detail) return null;

  const documents: VerificationDocument[] = [];
  if (detail.identityDocKey) {
    const contentType = docTypeFromKey(detail.identityDocKey);
    if (contentType) documents.push({ kind: "identity", label: "Identity document", url: `/api/verification-docs/${caseId}/identity`, contentType });
  }
  if (detail.ownershipDocKey) {
    const contentType = docTypeFromKey(detail.ownershipDocKey);
    if (contentType) documents.push({ kind: "ownership", label: "Vehicle ownership document", url: `/api/verification-docs/${caseId}/ownership`, contentType });
  }

  return { ...detail, documents };
}

function revalidateVerificationPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/verification");
}

export async function adminApproveVerificationAction(caseId: string): Promise<VerificationActionResult> {
  const staff = await requireStaff();
  const result = await decideVerificationAsStaff(staff.id, caseId, "verified", "");
  if (!result.ok) return result;
  revalidateVerificationPages();
  return { ok: true, message: "Verification approved." };
}

export async function adminRejectVerificationAction(caseId: string, reason: string): Promise<VerificationActionResult> {
  const staff = await requireStaff();
  const result = await decideVerificationAsStaff(staff.id, caseId, "rejected", reason);
  if (!result.ok) return result;
  revalidateVerificationPages();
  return { ok: true, message: "Verification rejected." };
}

export async function adminRequestResubmissionAction(caseId: string, reason: string): Promise<VerificationActionResult> {
  const staff = await requireStaff();
  const result = await decideVerificationAsStaff(staff.id, caseId, "action_required", reason);
  if (!result.ok) return result;
  revalidateVerificationPages();
  return { ok: true, message: "Resubmission requested." };
}
