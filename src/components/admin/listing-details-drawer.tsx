"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { PhotoCarousel } from "@/components/photo-carousel";
import { Badge, Card } from "@/components/ui";
import { formatDate, formatKm, formatPkr, formatRelativeTime } from "@/lib/format";
import { getListingDetailAction, type ListingDetail } from "@/lib/actions/admin-listings";
import { RowsSkeleton, SectionSkeleton } from "@/components/admin/skeletons";
import { ListingActions } from "./listing-actions";
import { ListingContentEditor } from "./listing-content-editor";

const VERIFICATION_BADGE = {
  verified: { tone: "verified" as const, label: "Verified" },
  pending: { tone: "review" as const, label: "Pending" },
  none: { tone: "neutral" as const, label: "Unverified" },
};

export function ListingDetailsDrawer({
  listingId,
  open,
  onOpenChange,
}: {
  listingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !listingId) return;
    let cancelled = false;
    // The state resets and the fetch kickoff both happen inside a rAF callback (not
    // synchronously in the effect body) per react-hooks/set-state-in-effect — an
    // imperceptible ~16ms defer, and deferring the fetch alongside the resets (not just
    // the resets alone) avoids a race where a very fast response could set loading=false
    // before a separately-deferred loading=true ever ran.
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setDetail(null);
      getListingDetailAction(listingId)
        .then((d) => {
          if (cancelled) return;
          setLoading(false);
          if (!d) setError("Listing not found.");
          else setDetail(d);
        })
        .catch(() => {
          if (!cancelled) {
            setLoading(false);
            setError("Failed to load listing details.");
          }
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open, listingId]);

  const title = detail ? `${detail.make} ${detail.model}${detail.variant ? ` ${detail.variant}` : ""}, ${detail.year}` : "Listing details";

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={detail ? `Listing ID: ${detail.id}` : undefined}>
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

function DrawerBody({ detail }: { detail: ListingDetail }) {
  const verificationBadge = VERIFICATION_BADGE[detail.seller.verificationStatus];

  return (
    <div className="space-y-8">
      <ListingActions listing={{ id: detail.id, status: detail.status, featured: detail.featured }} />

      {detail.photos.length > 0 ? (
        <PhotoCarousel
          photos={detail.photos}
          alt={`${detail.make} ${detail.model}`}
          aspectClassName="aspect-video"
          objectFit="contain"
          whiteBackground
          showArrows="always"
          showDots
          showCounter
          showThumbnails
          enableKeyboard
          enableZoom
          imageSizes="(min-width: 1024px) 640px, 100vw"
        />
      ) : (
        <div className="photo-placeholder aspect-video rounded-card">no photos</div>
      )}

      <Section title="Overview">
        <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
          <Stat label="Price" value={formatPkr(detail.askingPricePkr)} />
          <Stat label="Mileage" value={formatKm(detail.mileageKm)} />
          <Stat label="Transmission" value={detail.transmission} capitalize />
          <Stat label="Fuel" value={detail.fuel} capitalize />
          <Stat label="Engine" value={detail.engineCc ? `${detail.engineCc} cc` : "—"} />
          <Stat label="Ownership" value={detail.ownershipCount ? `${detail.ownershipCount}` : "—"} />
          <Stat label="City" value={detail.city} />
          <Stat label="Registered" value={detail.registrationCity ?? "—"} />
          <Stat label="Body type" value={detail.bodyType ?? "—"} />
          <Stat label="Assembly" value={detail.assembly ?? "—"} capitalize />
          <Stat label="Exterior" value={detail.exteriorColor ?? "—"} />
          <Stat label="Interior" value={detail.interiorColor ?? "—"} />
        </dl>
        {detail.rejectionReason && (
          <p className="mt-3 rounded-input border border-alert-soft bg-alert-soft p-3 text-[13px] text-alert-ink">
            Correction requested: {detail.rejectionReason}
          </p>
        )}
      </Section>

      <Section title="Car overview & features">
        <ListingContentEditor listingId={detail.id} description={detail.description} features={detail.features} />
      </Section>

      {detail.disclosures && (
        <Section title="Condition disclosures">
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <Stat label="Painted panels" value={detail.disclosures.paintedPanels || "—"} />
            <Stat label="Accident history" value={detail.disclosures.accidentHistory || "—"} />
            <Stat label="Mechanical issues" value={detail.disclosures.mechanicalIssues || "—"} />
            <Stat label="Documents" value={detail.disclosures.documents || "—"} />
          </dl>
        </Section>
      )}

      <Section title="Seller">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/admin/users/${detail.seller.id}`} className="font-semibold hover:text-brand">
              {detail.seller.name ?? "No name"}
            </Link>
            <p className="mt-0.5 text-[13px] text-muted">
              {detail.seller.phone ?? "No phone"} · {detail.seller.email ?? "No email"}
            </p>
            <p className="text-[13px] text-muted">
              {detail.seller.city ?? "No city"} · joined {formatDate(detail.seller.joinedAt)}
            </p>
          </div>
          <Badge tone={verificationBadge.tone} className="px-2.5 py-1 text-[11px]">
            {verificationBadge.label}
          </Badge>
        </div>
      </Section>

      <Section title="Engagement">
        <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          <Stat label="Views" value={detail.viewCount.toLocaleString("en-PK")} />
          <Stat label="Favorites" value={detail.favoritesCount.toLocaleString("en-PK")} />
          <Stat label="Messages" value={detail.messagesCount.toLocaleString("en-PK")} />
          <Stat label="Offers" value={detail.offers.length.toLocaleString("en-PK")} />
        </dl>
      </Section>

      {detail.offers.length > 0 && (
        <Section title={`Offers (${detail.offers.length})`}>
          <div className="space-y-2">
            {detail.offers.map((o) => (
              <Card key={o.id} className="flex items-center justify-between p-3 text-[13px]">
                <span className="font-semibold">{formatPkr(o.amountPkr)}</span>
                <span className="text-muted">
                  {o.status} · {formatRelativeTime(o.createdAt)}
                </span>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {detail.reports.length > 0 && (
        <Section title={`Reports (${detail.reports.length})`}>
          <div className="space-y-2">
            {detail.reports.map((r) => (
              <Card key={r.id} className="p-3 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize">{r.category.replace(/_/g, " ")}</span>
                  <Badge tone="review" className="px-2 py-0.5 text-[10px] capitalize">
                    {r.status}
                  </Badge>
                </div>
                <p className="mt-1 text-muted">
                  By {r.reporterName ?? "Unknown"} · {formatRelativeTime(r.createdAt)}
                </p>
                {r.detail && <p className="mt-1">{r.detail}</p>}
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Section title="History">
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

function Stat({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={`font-medium ${capitalize ? "capitalize" : ""}`}>{value}</dd>
    </div>
  );
}
