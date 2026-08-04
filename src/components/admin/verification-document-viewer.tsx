"use client";

import { useEffect, useState } from "react";
import { useImageZoom } from "@/lib/use-image-zoom";
import type { VerificationDocument } from "@/lib/actions/admin-verification";

/** Documents-only viewer (zoom/pan/pinch, previous/next, download) — the approve/
 * reject/resubmission workflow lives in VerificationActions, rendered alongside this
 * by the drawer that hosts both, not duplicated in here. Reuses the same zoom hook
 * PhotoCarousel/PhotoLightbox already use rather than a second zoom implementation;
 * a PDF document just doesn't attach to it (no zoom for those, an <iframe> instead). */
export function VerificationDocumentViewer({ documents }: { documents: VerificationDocument[] }) {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i - 1 + documents.length) % documents.length);
  const next = () => setIndex((i) => (i + 1) % documents.length);

  const { containerRef, imageRef, zoomed, dragging, reset } = useImageZoom({
    onSwipeLeft: next,
    onSwipeRight: prev,
    onArrowLeft: prev,
    onArrowRight: next,
  });

  useEffect(() => {
    reset();
  }, [index, reset]);

  const [trackedCount, setTrackedCount] = useState(documents.length);
  if (documents.length !== trackedCount) {
    setTrackedCount(documents.length);
    setIndex(0);
  }

  if (documents.length === 0) {
    return <div className="photo-placeholder aspect-video rounded-card">no documents uploaded</div>;
  }

  const doc = documents[index];
  const isImage = doc.contentType.startsWith("image/");

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold">{doc.label}</span>
        <span className="text-[12px] text-muted">
          Document {index + 1} of {documents.length}
        </span>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-card border border-border bg-white">
        {isImage ? (
          <div
            ref={containerRef as React.RefObject<HTMLDivElement>}
            role="button"
            tabIndex={0}
            aria-label={`${doc.label}. Scroll, pinch, or double-click to zoom.`}
            className={`absolute inset-0 overflow-hidden ${zoomed && dragging ? "cursor-grabbing" : zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          >
            <div ref={imageRef as React.RefObject<HTMLDivElement>} className="absolute inset-0" style={{ transformOrigin: "center" }}>
              {/* A private, per-request-authenticated document (see
                  /api/verification-docs/[caseId]/[doc]/route.ts) — not a public S3 URL,
                  so next/image's remotePatterns optimization doesn't apply here; a plain
                  <img> against the same-origin API route is the correct fit. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={doc.url} alt={doc.label} className="h-full w-full object-contain" draggable={false} onDragStart={(e) => e.preventDefault()} />
            </div>
          </div>
        ) : (
          <iframe src={doc.url} title={doc.label} className="h-full w-full" />
        )}

        {documents.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous document"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1.5 text-lg text-foreground shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next document"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1.5 text-lg text-foreground shadow hover:bg-white"
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex gap-1.5">
          {documents.map((d, i) => (
            <button
              key={d.kind}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${d.label}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-brand" : "w-1.5 bg-neutral-chip hover:bg-border-input"}`}
            />
          ))}
        </div>
        <a
          href={doc.url}
          download
          className="rounded-control border border-border-input px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-background"
        >
          Download
        </a>
      </div>
    </div>
  );
}
