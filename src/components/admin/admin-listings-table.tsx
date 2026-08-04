"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatDate, formatPkr } from "@/lib/format";
import type { ListingSummary } from "@/lib/admin/listings";
import { EmptyState } from "@/components/admin/section-card";
import { STATUS_BADGE } from "./listing-actions";
import { BulkActionsBar } from "./bulk-actions-bar";
import { ListingDetailsDrawer } from "./listing-details-drawer";

const VERIFICATION_BADGE = {
  verified: { tone: "verified" as const, label: "Verified" },
  pending: { tone: "review" as const, label: "Pending" },
  none: { tone: "neutral" as const, label: "Unverified" },
};

/** The professional listings table — checkbox selection (feeds BulkActionsBar) and the
 * View button (opens ListingDetailsDrawer, which owns the actual moderation actions)
 * are the only interactive pieces here; everything else is a read-only summary row, so
 * the table itself stays scannable rather than a wall of buttons per row. */
export function AdminListingsTable({ listings }: { listings: ListingSummary[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === listings.length ? new Set() : new Set(listings.map((l) => l.id))));
  }

  if (listings.length === 0) return <EmptyState>No listings match these filters.</EmptyState>;

  return (
    <div className="space-y-4">
      <BulkActionsBar selectedIds={[...selected]} onDone={() => setSelected(new Set())} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <input
                type="checkbox"
                checked={selected.size === listings.length && listings.length > 0}
                onChange={toggleAll}
                aria-label="Select all listings"
                className="h-4 w-4 rounded border-border-input accent-current text-brand"
              />
            </TableHead>
            <TableHead>Listing</TableHead>
            <TableHead className="hidden md:table-cell">Seller</TableHead>
            <TableHead className="hidden sm:table-cell">City</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Verification</TableHead>
            <TableHead className="hidden lg:table-cell text-center">Views</TableHead>
            <TableHead className="hidden lg:table-cell text-center">Favorites</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead>&nbsp;</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((l) => {
            const statusBadge = STATUS_BADGE[l.status] ?? { tone: "neutral" as const, label: l.status };
            const verificationBadge = VERIFICATION_BADGE[l.verificationStatus];
            return (
              <TableRow key={l.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggle(l.id)}
                    aria-label={`Select ${l.title}`}
                    className="h-4 w-4 rounded border-border-input accent-current text-brand"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-input bg-neutral-chip">
                      {l.photoUrl ? (
                        <Image src={l.photoUrl} alt={l.title} fill className="object-cover" sizes="64px" />
                      ) : (
                        <div className="photo-placeholder h-full w-full text-[8px]">no photo</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <button type="button" onClick={() => setDrawerId(l.id)} className="truncate text-left font-semibold hover:text-brand">
                        {l.title}
                      </button>
                      <p className="truncate text-[11px] text-muted">{l.id}</p>
                      {l.featured && (
                        <Badge tone="gold" className="mt-1 px-2 py-0.5 text-[10px]">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="truncate">{l.sellerName ?? "No name"}</p>
                  <p className="truncate text-[11px] text-muted">{l.sellerPhone ?? l.sellerEmail ?? "—"}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{l.city}</TableCell>
                <TableCell className="whitespace-nowrap">{formatPkr(l.price)}</TableCell>
                <TableCell>
                  <Badge tone={statusBadge.tone} className="px-2.5 py-1 text-[11px]">
                    {statusBadge.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge tone={verificationBadge.tone} className="px-2.5 py-1 text-[11px]">
                    {verificationBadge.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-center">{l.viewCount.toLocaleString("en-PK")}</TableCell>
                <TableCell className="hidden lg:table-cell text-center">{l.favoritesCount.toLocaleString("en-PK")}</TableCell>
                <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(l.createdAt)}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setDrawerId(l.id)}
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

      <ListingDetailsDrawer listingId={drawerId} open={drawerId !== null} onOpenChange={(open) => !open && setDrawerId(null)} />
    </div>
  );
}
