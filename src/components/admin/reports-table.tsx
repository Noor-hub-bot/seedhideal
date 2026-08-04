"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { ReportSummary } from "@/lib/admin/reports";
import { EmptyState } from "@/components/admin/section-card";
import { ReportActions } from "./report-actions";
import { ReportDetailsDrawer } from "./report-details-drawer";

const PRIORITY_BADGE: Record<string, { tone: "review" | "gold" | "neutral"; label: string }> = {
  high: { tone: "review", label: "High" },
  medium: { tone: "gold", label: "Medium" },
  low: { tone: "neutral", label: "Low" },
};

/** The reports queue table — row-level moderation actions (via ReportActions, the same
 * component the drawer uses) plus a "View" button that opens the full drawer for the
 * reporter/reported-party detail, gallery, previous reports and audit history. */
export function ReportsTable({ reports }: { reports: ReportSummary[] }) {
  const [drawerId, setDrawerId] = useState<string | null>(null);

  if (reports.length === 0) return <EmptyState>No reports match these filters.</EmptyState>;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Report ID</TableHead>
            <TableHead className="hidden lg:table-cell">Type</TableHead>
            <TableHead>Listing / User</TableHead>
            <TableHead className="hidden md:table-cell">Reporter</TableHead>
            <TableHead className="hidden md:table-cell">Reason</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="hidden sm:table-cell">Submitted</TableHead>
            <TableHead>Status &amp; actions</TableHead>
            <TableHead>&nbsp;</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((r) => {
            const priority = PRIORITY_BADGE[r.priority];
            const targetHref = r.type === "listing" ? `/listings/${r.listingId}` : `/admin/users/${r.reportedUserId}`;
            const targetLabel = r.type === "listing" ? (r.listingTitle ?? "Listing") : (r.reportedUserName ?? "User");
            return (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted">{r.id.slice(0, 8)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge tone="neutral" className="px-2.5 py-1 text-[11px] capitalize">
                    {r.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={targetHref} className="font-semibold hover:text-brand">
                    {targetLabel}
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="truncate font-medium">{r.reporterName ?? "No name"}</p>
                  <p className="truncate text-[11px] text-muted">{r.reporterEmail ?? "No email"}</p>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap capitalize md:table-cell">{r.category.replace(/_/g, " ")}</TableCell>
                <TableCell>
                  <Badge tone={priority.tone} className="px-2.5 py-1 text-[11px]">
                    {priority.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap sm:table-cell">{formatDate(r.createdAt)}</TableCell>
                <TableCell>
                  <ReportActions report={{ id: r.id, status: r.status, listingId: r.listingId, targetUserId: r.reportedUserId ?? null }} />
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setDrawerId(r.id)}
                    className="whitespace-nowrap rounded-control border border-border-input px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-background"
                  >
                    View
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ReportDetailsDrawer reportId={drawerId} open={drawerId !== null} onOpenChange={(open) => !open && setDrawerId(null)} />
    </div>
  );
}
