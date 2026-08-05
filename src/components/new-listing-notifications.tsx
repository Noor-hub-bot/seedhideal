"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Badge, ButtonLink } from "@/components/ui";
import { formatPkr } from "@/lib/format";

type NewListing = {
  id: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  askingPricePkr: number;
  city: string;
  photo: string | null;
  approvedAt: string;
};

type QueuedNotification = NewListing & { key: string };

// No WebSocket/SSE/pubsub service exists in this project (no Pusher/Ably/Redis/etc. —
// see the API route this polls), so "real-time" here means near-real-time: every
// visitor's browser checks in on this interval rather than the server pushing instantly.
const POLL_MS = 10_000;
const AUTO_HIDE_MS = 5_000;
// "Queue without overlapping" — at most this many cards stack at once; anything beyond
// that waits in an internal queue and gets promoted as a visible slot frees up, rather
// than piling every notification on screen simultaneously.
const MAX_VISIBLE = 3;

/** Mounted once, globally, in the root layout — every visitor (signed in or not, on any
 * page) gets a toast the moment a listing goes active/live, exactly matching what
 * approveListingAsStaff (the only place a listing's status becomes "active") sets on
 * listings.approvedAt. Nothing shows for a listing still submitted/under_review/
 * correction, since approvedAt is only ever set at approval. */
export function NewListingNotifications() {
  const [visible, setVisible] = useState<QueuedNotification[]>([]);
  const queueRef = useRef<QueuedNotification[]>([]);

  // Cursor starts at "now" — a visitor who arrives mid-session only ever sees toasts for
  // listings approved AFTER they showed up, never a flood of everything already live.
  const cursorRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    function promote() {
      setVisible((prev) => {
        if (prev.length >= MAX_VISIBLE || queueRef.current.length === 0) return prev;
        const room = MAX_VISIBLE - prev.length;
        const promoted = queueRef.current.splice(0, room);
        return [...prev, ...promoted];
      });
    }

    async function poll() {
      try {
        const res = await fetch(`/api/listings/recent-approvals?since=${encodeURIComponent(cursorRef.current)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data: { listings?: NewListing[] } = await res.json();
          const items = data.listings ?? [];
          if (items.length > 0) {
            cursorRef.current = items[items.length - 1].approvedAt;
            queueRef.current.push(...items.map((it) => ({ ...it, key: `${it.id}-${it.approvedAt}` })));
            promote();
          }
        }
      } catch {
        // Best-effort — a failed poll just retries on the next interval.
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }

    timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  function dismiss(key: string) {
    setVisible((prev) => {
      const next = prev.filter((v) => v.key !== key);
      if (queueRef.current.length > 0) {
        const [promoted] = queueRef.current.splice(0, 1);
        return [...next, promoted];
      }
      return next;
    });
  }

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-stretch gap-3 sm:inset-x-auto sm:right-6 sm:items-end">
      {visible.map((n) => (
        <NotificationCard key={n.key} listing={n} onDismiss={() => dismiss(n.key)} />
      ))}
    </div>
  );
}

function NotificationCard({ listing, onDismiss }: { listing: QueuedNotification; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
    // Auto-hide is a fixed 5s from mount, not tied to onDismiss identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = `${listing.make} ${listing.model}${listing.variant ? ` ${listing.variant}` : ""}, ${listing.year}`;

  return (
    <div className="new-listing-enter pointer-events-auto w-full rounded-card border border-border bg-surface shadow-lg sm:w-[340px]">
      <div className="flex gap-3 p-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-input bg-neutral-chip">
          {listing.photo ? (
            <Image src={listing.photo} alt={title} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="photo-placeholder h-full w-full text-[8px] leading-tight">no photo</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <Badge tone="brand" className="px-2 py-0.5 text-[10px]">
              New Listing
            </Badge>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="shrink-0 text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <p className="truncate text-[13px] font-semibold" title={title}>
            {title}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-muted">{listing.city}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="font-display text-[15px] font-medium">{formatPkr(listing.askingPricePkr)}</p>
            <ButtonLink href={`/cars/${listing.id}`} className="shrink-0 px-2.5 py-1.5 text-[11px]">
              View Listing
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
