"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useImageZoom } from "@/lib/use-image-zoom";
import { PhotoThumbnailStrip } from "@/components/photo-thumbnail-strip";

const CLOSE_ANIMATION_MS = 200;

/** Premium fullscreen photo viewer — always index/onIndexChange-controlled by the parent
 * (see PhotoGallery) so it never keeps its own separate copy of "which photo," and closing
 * it can never desync from or reset the inline carousel it was opened from. Zoom/pan/pinch
 * and swipe/arrow-key navigation are the same use-image-zoom hook PhotoCarousel uses,
 * rather than a second, simpler zoom implementation. */
export function PhotoLightbox({
  photos,
  alt,
  index,
  onIndexChange,
  onClose,
}: {
  photos: string[];
  alt: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const prev = () => onIndexChange((index - 1 + photos.length) % photos.length);
  const next = () => onIndexChange((index + 1) % photos.length);

  function requestClose() {
    setVisible(false);
    window.setTimeout(onClose, CLOSE_ANIMATION_MS);
  }

  const { containerRef: zoomContainerRef, imageRef: zoomImageRef, zoomed, dragging, reset: resetZoom } = useImageZoom({
    onSwipeLeft: next,
    onSwipeRight: prev,
    onArrowLeft: prev,
    onArrowRight: next,
  });

  // Plays the open animation, focuses the zoomable image (so arrow keys/Escape/+/- work
  // immediately without requiring a click first — its own keydown listener only fires
  // while it or a descendant holds focus), and locks page scroll while open.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    zoomContainerRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes the whole modal — but only reaches here when NOT zoomed: the zoom
  // hook's own keydown handler (attached to zoomContainerRef, a descendant) intercepts
  // Escape-while-zoomed first via stopPropagation, to reset zoom instead of closing.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoom is a property of the currently-shown photo — reset it whenever the active index
  // changes (arrows, thumbnails, swipe, keyboard).
  useEffect(() => {
    resetZoom();
  }, [index, resetZoom]);

  // The loading skeleton is also a property of the current photo — reset it when index
  // changes by adjusting state during render (tracking the previous index) rather than
  // calling setState directly inside an effect, which would trigger an extra cascading
  // render for the same update. Same pattern PhotoCarousel uses for its photos-array reset.
  const [trackedIndex, setTrackedIndex] = useState(index);
  if (index !== trackedIndex) {
    setTrackedIndex(index);
    setLoaded(false);
  }

  if (photos.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
      className={`fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={requestClose}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            requestClose();
          }}
          aria-label="Close preview"
          className="rounded-full p-1 text-2xl leading-none hover:bg-white/10"
        >
          ×
        </button>
        <span className="text-sm">
          Image {index + 1} of {photos.length}
        </span>
      </div>

      <div
        className={`relative mx-auto flex w-full max-w-5xl flex-1 items-center justify-center overflow-hidden px-4 transition-transform duration-200 ${
          visible ? "scale-100" : "scale-95"
        }`}
      >
        <div
          ref={zoomContainerRef as React.RefObject<HTMLDivElement>}
          role="button"
          tabIndex={0}
          aria-label={`Photo ${index + 1} of ${photos.length}. Scroll, pinch, or double-click to zoom.`}
          className={`relative h-full w-full overflow-hidden bg-white ${
            zoomed && dragging ? "cursor-grabbing" : zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {!loaded && <div className="absolute inset-0 animate-pulse bg-neutral-chip" />}
          <div ref={zoomImageRef as React.RefObject<HTMLDivElement>} className="absolute inset-0" style={{ transformOrigin: "center" }}>
            <Image
              src={photos[index]}
              alt={`${alt} photo ${index + 1}`}
              fill
              sizes="100vw"
              priority
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onLoad={() => setLoaded(true)}
              className="object-contain"
            />
          </div>
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20"
            >
              ›
            </button>
          </>
        )}
      </div>

      <PhotoThumbnailStrip
        photos={photos}
        alt={alt}
        index={index}
        onSelect={onIndexChange}
        className="justify-center p-4"
        thumbClassName="h-14 w-20 sm:h-16 sm:w-24"
      />
    </div>
  );
}
