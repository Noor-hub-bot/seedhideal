import { Badge, ButtonLink, Card } from "@/components/ui";
import type { verificationCases } from "@/db";

type VerificationCase = typeof verificationCases.$inferSelect;

export function VerificationCard({ verification }: { verification?: VerificationCase }) {
  if (!verification) {
    return (
      <Card className="p-5">
        <h2 className="font-semibold">Get verified</h2>
        <p className="mt-1 text-sm text-muted">
          Verified owners get a gold badge buyers trust. Upload your ID and ownership
          documents — reviewed by our team, never shown publicly.
        </p>
        <ButtonLink href="/dashboard/verify" className="mt-3">
          Start verification
        </ButtonLink>
      </Card>
    );
  }

  if (verification.status === "verified") {
    return (
      <Card className="flex items-center gap-2.5 p-4">
        <Badge tone="gold">✓ Verified owner</Badge>
        <p className="text-sm text-muted">Your identity and ownership evidence are confirmed.</p>
      </Card>
    );
  }

  if (verification.status === "pending") {
    return (
      <Card className="p-5">
        <h2 className="font-semibold">Verification pending</h2>
        <p className="mt-1 text-sm text-muted">
          We&apos;re reviewing your documents — you&apos;ll be notified once it&apos;s checked.
        </p>
      </Card>
    );
  }

  if (verification.status === "suspended") {
    return (
      <Card className="p-5">
        <h2 className="font-semibold">Verification suspended</h2>
        <p className="mt-1 text-sm text-muted">Contact support for details on your account.</p>
      </Card>
    );
  }

  // rejected, action_required, expired — resubmission is expected
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Verification needs another look</h2>
      {verification.reviewerNote && (
        <p className="mt-1 rounded-input bg-alert-soft px-2 py-1 text-xs text-alert-ink">
          {verification.reviewerNote}
        </p>
      )}
      <ButtonLink href="/dashboard/verify" className="mt-3">
        Resubmit documents
      </ButtonLink>
    </Card>
  );
}
