import { eq } from "drizzle-orm";
import { db, verificationCases } from "@/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getVerificationDocBytes } from "@/lib/storage";

// Private document viewer (VER-04): identity/ownership docs are never exposed via a public
// URL — this is the only path that can read them, and only for the case owner or staff.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ caseId: string; doc: string }> },
) {
  const { caseId, doc } = await params;
  if (doc !== "identity" && doc !== "ownership") {
    return new Response("Not found", { status: 404 });
  }

  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [verificationCase] = await db
    .select()
    .from(verificationCases)
    .where(eq(verificationCases.id, caseId));
  if (!verificationCase) return new Response("Not found", { status: 404 });
  if (verificationCase.userId !== user.id && !isStaff(user)) {
    return new Response("Forbidden", { status: 403 });
  }

  const key = doc === "identity" ? verificationCase.identityDocKey : verificationCase.ownershipDocKey;
  if (!key) return new Response("Not found", { status: 404 });

  const { bytes, contentType } = await getVerificationDocBytes(key);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
