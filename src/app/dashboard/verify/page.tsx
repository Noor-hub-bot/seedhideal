import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, verificationCases } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Badge, Card, Heading } from "@/components/ui";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Get verified" };

const RESUBMIT_STATUSES = new Set(["rejected", "action_required", "expired"]);

export default async function VerifyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/dashboard/verify");

  const [latest] = await db
    .select()
    .from(verificationCases)
    .where(eq(verificationCases.userId, user.id))
    .orderBy(desc(verificationCases.createdAt))
    .limit(1);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Heading size="lg" className="mb-2">
        Get verified
      </Heading>
      <p className="mb-6 text-sm text-muted">
        Verified owners get a gold badge buyers trust. Your documents are reviewed by our
        team and never shown publicly.
      </p>

      {latest && latest.status === "verified" && (
        <Card className="mb-6 flex items-center gap-2.5 p-4">
          <Badge tone="gold">✓ Verified owner</Badge>
          <p className="text-sm text-muted">Your identity and ownership evidence are confirmed.</p>
        </Card>
      )}

      {latest && latest.status === "pending" && (
        <Card className="p-6 text-sm text-muted">
          Your documents are with our review team. We&apos;ll notify you once they&apos;re
          checked.
        </Card>
      )}

      {latest && latest.status === "suspended" && (
        <Card className="p-6 text-sm text-muted">
          Your verification is suspended. Contact support for details on your account.
        </Card>
      )}

      {(!latest || RESUBMIT_STATUSES.has(latest.status)) && (
        <>
          {latest?.reviewerNote && (
            <Card className="mb-4 p-4 text-sm text-alert-ink">
              Last review note: {latest.reviewerNote}
            </Card>
          )}
          <VerifyForm />
        </>
      )}
    </div>
  );
}
