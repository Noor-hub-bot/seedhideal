"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { PhotoCarousel } from "@/components/photo-carousel";
import { Badge, Card } from "@/components/ui";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { getReportDetailAction } from "@/lib/actions/admin-reports";
import type { ReportDetail } from "@/lib/admin/reports";
import { RowsSkeleton, SectionSkeleton } from "@/components/admin/skeletons";
import { ReportActions, REPORT_STATUS_BADGE } from "./report-actions";

const HISTORY_LABEL: Record<string, string> = {
  status_updated: "Status changed",
  internal_note: "Internal note",
  warning_sent: "Warning sent",
  listing_suspended: "Listing suspended",
  user_suspended: "User suspended",
  listing_deleted: "Listing deleted",
};

export function ReportDetailsDrawer({
  reportId,
  open,
  onOpenChange,
}: {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !reportId) return;
    let cancelled = false;
    // Deferred one frame — see the identical comment in listing-details-drawer.tsx
    // (react-hooks/set-state-in-effect, and avoiding a fast-response race).
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setDetail(null);
      getReportDetailAction(reportId)
        .then((d) => {
          if (cancelled) return;
          setLoading(false);
          if (!d) setError("Report not found.");
          else setDetail(d);
        })
        .catch(() => {
          if (!cancelled) {
            setLoading(false);
            setError("Failed to load report details.");
          }
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open, reportId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={detail ? detail.category.replace(/_/g, " ") : "Report details"} description={detail ? `Report ID: ${detail.id}` : undefined}>
      {loading && (
        <div className="space-y-6">
          <SectionSkeleton height="h-40" />
          <RowsSkeleton rows={3} />
        </div>
      )}
      {error && <p className="text-sm text-alert-ink">{error}</p>}
      {detail && <DrawerBody detail={detail} />}
    </Sheet>
  );
}

function DrawerBody({ detail }: { detail: ReportDetail }) {
  const targetUserId = detail.reportedUser?.id ?? detail.listing?.sellerId ?? null;

  return (
    <div className="space-y-8">
      <ReportActions report={{ id: detail.id, status: detail.status, listingId: detail.listing?.id ?? null, targetUserId }} />

      <Section title="Report">
        <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
          <Stat label="Reason" value={detail.category.replace(/_/g, " ")} capitalize />
          <Stat label="Priority" value={detail.priority} capitalize />
          <Stat label="Submitted" value={formatDate(detail.createdAt)} />
        </dl>
        {detail.detail && <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-body-soft">{detail.detail}</p>}
      </Section>

      <Section title="Reporter">
        <Link href={`/admin/users/${detail.reporter.id}`} className="font-semibold hover:text-brand">
          {detail.reporter.name ?? "No name"}
        </Link>
        <p className="mt-0.5 text-[13px] text-muted">
          {detail.reporter.phone ?? "No phone"} · {detail.reporter.email ?? "No email"}
        </p>
      </Section>

      {detail.reportedUser && (
        <Section title="Reported user">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href={`/admin/users/${detail.reportedUser.id}`} className="font-semibold hover:text-brand">
                {detail.reportedUser.name ?? "No name"}
              </Link>
              <p className="mt-0.5 text-[13px] text-muted">
                {detail.reportedUser.phone ?? "No phone"} · {detail.reportedUser.email ?? "No email"}
              </p>
            </div>
            <Badge tone="neutral" className="px-2.5 py-1 text-[11px] capitalize">
              {detail.reportedUser.status}
            </Badge>
          </div>
        </Section>
      )}

      {detail.listing && (
        <Section title="Reported listing">
          {detail.listing.photos.length > 0 ? (
            <PhotoCarousel
              photos={detail.listing.photos}
              alt={detail.listing.title}
              aspectClassName="aspect-video"
              objectFit="contain"
              whiteBackground
              showArrows="always"
              showDots
              showCounter
              enableKeyboard
              enableZoom
              imageSizes="(min-width: 1024px) 640px, 100vw"
            />
          ) : (
            <div className="photo-placeholder aspect-video rounded-card">no photos</div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href={`/listings/${detail.listing.id}`} className="font-semibold hover:text-brand">
                {detail.listing.title}
              </Link>
              <p className="mt-0.5 text-[13px] text-muted">
                {detail.listing.city} · sold by{" "}
                <Link href={`/admin/users/${detail.listing.sellerId}`} className="hover:text-brand">
                  {detail.listing.sellerName ?? "Unknown"}
                </Link>
              </p>
            </div>
            <Badge tone="neutral" className="px-2.5 py-1 text-[11px] capitalize">
              {detail.listing.status}
            </Badge>
          </div>
        </Section>
      )}

      {detail.previousReports.length > 0 && (
        <Section title={`Previous reports (${detail.previousReports.length})`}>
          <div className="space-y-2">
            {detail.previousReports.map((r) => (
              <Card key={r.id} className="p-3 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize">{r.category.replace(/_/g, " ")}</span>
                  <Badge tone={(REPORT_STATUS_BADGE[r.status] ?? { tone: "neutral" as const }).tone} className="px-2 py-0.5 text-[10px] capitalize">
                    {(REPORT_STATUS_BADGE[r.status] ?? { label: r.status }).label}
                  </Badge>
                </div>
                <p className="mt-1 text-muted">
                  By {r.reporterName ?? "Unknown"} · {formatRelativeTime(r.createdAt)}
                </p>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Section title="Audit history">
        {detail.history.length === 0 ? (
          <p className="text-[13px] text-muted">No recorded activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {detail.history.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3 text-[13px]">
                <span>
                  {h.actorName ?? "System"} — {HISTORY_LABEL[h.action] ?? h.action.replace(/_/g, " ")}
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

function Stat({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={`font-medium ${capitalize ? "capitalize" : ""}`}>{value}</dd>
    </div>
  );
}
