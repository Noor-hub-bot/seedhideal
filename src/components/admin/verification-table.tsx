"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { VerificationCaseSummary } from "@/lib/admin/verification";
import { EmptyState } from "@/components/admin/section-card";
import { VerificationActions } from "./verification-actions";
import { VerificationDetailsDrawer } from "./verification-details-drawer";

/** The verification queue table — row-level Approve/Reject/Request Resubmission (via
 * VerificationActions, the same component the drawer uses) plus a "View Documents"
 * button that opens the full drawer for document review and history. */
export function VerificationTable({ cases }: { cases: VerificationCaseSummary[] }) {
  const [drawerId, setDrawerId] = useState<string | null>(null);

  if (cases.length === 0) return <EmptyState>No verification requests match these filters.</EmptyState>;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead className="hidden md:table-cell">Phone</TableHead>
            <TableHead className="hidden lg:table-cell">Type</TableHead>
            <TableHead className="hidden md:table-cell">Submitted</TableHead>
            <TableHead className="hidden sm:table-cell text-center">Docs</TableHead>
            <TableHead>Status &amp; actions</TableHead>
            <TableHead>&nbsp;</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-chip">
                    {c.userAvatarUrl ? (
                      <Image src={c.userAvatarUrl} alt={c.userName ?? "Applicant"} fill className="object-cover" sizes="36px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-sm font-medium text-muted">
                        {(c.userName ?? c.userEmail ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.userName ?? "No name"}</p>
                    <p className="truncate text-[11px] text-muted">{c.userEmail ?? "No email"}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell whitespace-nowrap">{c.userPhone ?? "—"}</TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge tone="neutral" className="px-2.5 py-1 text-[11px] capitalize">
                  {c.userType === "dealer" ? "Dealer" : "Private seller"}
                </Badge>
              </TableCell>
              <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(c.createdAt)}</TableCell>
              <TableCell className="hidden sm:table-cell text-center">{c.documentCount}</TableCell>
              <TableCell>
                <VerificationActions caseData={c} />
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setDrawerId(c.id)}
                  className="whitespace-nowrap rounded-control border border-border-input px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-background"
                >
                  View Documents
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <VerificationDetailsDrawer caseId={drawerId} open={drawerId !== null} onOpenChange={(open) => !open && setDrawerId(null)} />
    </div>
  );
}
