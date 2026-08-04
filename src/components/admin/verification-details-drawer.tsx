"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { getVerificationCaseDetailAction, type VerificationCaseDetailWithDocs } from "@/lib/actions/admin-verification";
import { RowsSkeleton, SectionSkeleton } from "@/components/admin/skeletons";
import { VerificationActions } from "./verification-actions";
import { VerificationDocumentViewer } from "./verification-document-viewer";

export function VerificationDetailsDrawer({
  caseId,
  open,
  onOpenChange,
}: {
  caseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<VerificationCaseDetailWithDocs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !caseId) return;
    let cancelled = false;
    // Deferred one frame — see the identical comment in listing-details-drawer.tsx for
    // why (react-hooks/set-state-in-effect, and avoiding a fast-response race).
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setDetail(null);
      getVerificationCaseDetailAction(caseId)
        .then((d) => {
          if (cancelled) return;
          setLoading(false);
          if (!d) setError("Verification case not found.");
          else setDetail(d);
        })
        .catch(() => {
          if (!cancelled) {
            setLoading(false);
            setError("Failed to load verification details.");
          }
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open, caseId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={detail?.applicant.name ?? "Verification request"} description={detail ? `Case ID: ${detail.id}` : undefined}>
      {loading && (
        <div className="space-y-6">
          <SectionSkeleton height="h-64" />
          <RowsSkeleton rows={3} />
        </div>
      )}
      {error && <p className="text-sm text-alert-ink">{error}</p>}
      {detail && <DrawerBody detail={detail} />}
    </Sheet>
  );
}

function DrawerBody({ detail }: { detail: VerificationCaseDetailWithDocs }) {
  return (
    <div className="space-y-8">
      <VerificationActions caseData={{ id: detail.id, status: detail.status }} />

      <VerificationDocumentViewer documents={detail.documents} />

      <Section title="Applicant">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/admin/users/${detail.applicant.id}`} className="font-semibold hover:text-brand">
              {detail.applicant.name ?? "No name"}
            </Link>
            <p className="mt-0.5 text-[13px] text-muted">
              {detail.applicant.phone ?? "No phone"} · {detail.applicant.email ?? "No email"}
            </p>
            <p className="text-[13px] text-muted">{detail.applicant.city ?? "No city"}</p>
          </div>
          <Badge tone="neutral" className="px-2.5 py-1 text-[11px] capitalize">
            {detail.applicant.userType === "dealer" ? "Dealer" : "Private seller"}
          </Badge>
        </div>
        <p className="mt-2 text-[13px] text-muted">
          Claims: <span className="capitalize">{detail.relationship ?? "not specified"}</span>
        </p>
      </Section>

      <Section title="Timeline">
        <dl className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <dt className="text-[11px] text-muted">Submitted</dt>
            <dd className="font-medium">{formatDate(detail.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">Reviewed</dt>
            <dd className="font-medium">{detail.reviewedAt ? formatDate(detail.reviewedAt) : "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">Reviewer</dt>
            <dd className="font-medium">{detail.reviewer?.name ?? "—"}</dd>
          </div>
        </dl>
        {detail.reviewerNote && (
          <p className="mt-3 rounded-input border border-alert-soft bg-alert-soft p-3 text-[13px] text-alert-ink">{detail.reviewerNote}</p>
        )}
      </Section>

      <Section title="Audit history">
        {detail.history.length === 0 ? (
          <p className="text-[13px] text-muted">No recorded activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {detail.history.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3 text-[13px]">
                <span>
                  {h.actorName ?? "System"} — {h.action.replace(/_/g, " ")}
                  {h.reason ? `: ${h.reason}` : ""}
                </span>
                <span className="shrink-0 text-muted">{formatRelativeTime(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}
