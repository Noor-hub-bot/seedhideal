"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useImageZoom } from "@/lib/use-image-zoom";

export type PhotoCarouselProps = {
  photos: string[];
  alt: string;
  className?: string;
  /** Tailwind aspect-ratio class for the main image box. Fixed up front (not derived from
   * the loaded image) so the layout never shifts once photos arrive. */
  aspectClassName?: string;
  roundedClassName?: string;
  objectFit?: "contain" | "cover";
  /** White backdrop behind the image — only meaningful with objectFit="contain", where the
   * image may not fill the box and letterboxing needs a neutral color instead of transparency. */
  whiteBackground?: boolean;
  showArrows?: "always" | "hover" | "none";
  showDots?: boolean;
  showCounter?: boolean;
  showThumbnails?: boolean;
  enableKeyboard?: boolean;
  /** Auto-advance interval in ms; 0/undefined disables autoplay. Pauses on hover and while
   * a swipe/drag is in progress. */
  autoplayMs?: number;
  /** Wheel/double-click/pinch/drag zoom on the main image (see src/lib/use-image-zoom.ts).
   * Off by default — deliberately NOT enabled on the homepage hero carousel, where mixing
   * zoom-drag with a small autoplaying teaser card would be more confusing than useful;
   * the car detail page gallery turns this on. */
  enableZoom?: boolean;
  onImageClick?: (index: number) => void;
  priority?: boolean;
  imageSizes?: string;
};

/** Single reusable image carousel — the car detail page's full gallery and the homepage
 * hero card are both this component with different chrome switched on/off via props,
 * rather than two separate implementations of the same swipe/arrow/autoplay logic. */
export function PhotoCarousel({
  photos,
  alt,
  className = "",
  aspectClassName = "aspect-video",
  roundedClassName = "rounded-card",
  objectFit = "contain",
  whiteBackground = true,
  showArrows = "always",
  showDots = false,
  showCounter = false,
  showThumbnails = false,
  enableKeyboard = false,
  autoplayMs = 0,
  enableZoom = false,
  onImageClick,
  priority = false,
  imageSizes = "100vw",
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  // Swipe-to-navigate and arrow-key-to-navigate are handled by the zoom hook itself (see
  // its doc comment) so that "only when not zoomed" is enforced in one place rather than
  // coordinated across two separate gesture systems on the same element.
  const { containerRef: zoomContainerRef, imageRef: zoomImageRef, zoomed, dragging, reset: resetZoom } = useImageZoom({
    onSingleClick: () => onImageClick?.(index),
    onSwipeLeft: next,
    onSwipeRight: prev,
    onArrowLeft: enableKeyboard ? prev : undefined,
    onArrowRight: enableKeyboard ? next : undefined,
    disabled: !enableZoom,
  });

  useEffect(() => {
    if (!autoplayMs || photos.length <= 1 || hovered || dragging) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), autoplayMs);
    return () => clearInterval(timer);
  }, [autoplayMs, photos.length, hovered, dragging]);

  // Reset to the first photo if the underlying photo set changes (e.g. a different
  // listing's card) rather than carrying over a stale index from a previous set of a
  // different length — adjusting state during render avoids a setState-in-effect
  // cascading render.
  const [trackedPhotos, setTrackedPhotos] = useState(photos);
  if (photos !== trackedPhotos) {
    setTrackedPhotos(photos);
    setIndex(0);
  }

  // Zoom is a property of the currently-shown photo, not the carousel — always reset it
  // when the active index changes (arrows, dots, thumbnails, swipe, or the reset-to-0
  // above all funnel through here).
  useEffect(() => {
    resetZoom();
  }, [index, resetZoom]);

  if (photos.length === 0) {
    return <div className={`photo-placeholder ${aspectClassName} ${roundedClassName} ${className}`}>vehicle photo</div>;
  }

  const arrowsVisible = showArrows === "always" || (showArrows === "hover" && hovered);
  const cursorClass = !enableZoom
    ? ""
    : zoomed && dragging
      ? "cursor-grabbing"
      : zoomed
        ? "cursor-zoom-out"
        : "cursor-zoom-in";

  return (
    <div className={className}>
      <div
        className={`group relative w-full overflow-hidden ${roundedClassName} ${aspectClassName} ${
          whiteBackground && objectFit === "contain" ? "bg-white" : ""
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* A plain focusable div, not a <button>, when zoom is enabled — the zoom hook
            owns click detection itself (to disambiguate single/double click from a drag),
            so a native button-click handler here would double-fire alongside it. Without
            zoom, this stays a real <button> with a plain onClick, exactly as before. */}
        {enableZoom ? (
          <div
            ref={zoomContainerRef as React.RefObject<HTMLDivElement>}
            role="button"
            tabIndex={0}
            aria-label={onImageClick ? "View photo fullscreen. Scroll, pinch, or double-click to zoom." : `Photo ${index + 1} of ${photos.length}`}
            className={`absolute inset-0 overflow-hidden ${cursorClass}`}
          >
            <div
              ref={zoomImageRef as React.RefObject<HTMLDivElement>}
              className="absolute inset-0"
              style={{ transformOrigin: "center" }}
            >
              <Image
                src={photos[index]}
                alt={`${alt} photo ${index + 1}`}
                fill
                priority={priority}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                sizes={imageSizes}
                className={objectFit === "contain" ? "object-contain" : "object-cover"}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onImageClick?.(index)}
            aria-label={onImageClick ? "View photo fullscreen" : `Photo ${index + 1} of ${photos.length}`}
            className="absolute inset-0 overflow-hidden"
          >
            <Image
              src={photos[index]}
              alt={`${alt} photo ${index + 1}`}
              fill
              priority={priority}
              sizes={imageSizes}
              className={objectFit === "contain" ? "object-contain" : "object-cover"}
            />
          </button>
        )}

        {showCounter && photos.length > 1 && (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
            Image {index + 1} / {photos.length}
          </span>
        )}

        {photos.length > 1 && showArrows !== "none" && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1.5 text-lg text-foreground shadow transition-opacity hover:bg-white ${
                arrowsVisible ? "opacity-100" : "opacity-0"
              }`}
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
              onMouseDown={(e) => e.stopPropagation()}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1.5 text-lg text-foreground shadow transition-opacity hover:bg-white ${
                arrowsVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              ›
            </button>
          </>
        )}
      </div>

      {showDots && photos.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to photo ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-brand" : "w-1.5 bg-neutral-chip hover:bg-border-input"
              }`}
            />
          ))}
        </div>
      )}

      {showThumbnails && photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-input border-2 ${
                i === index ? "border-brand" : "border-transparent"
              }`}
            >
              <Image src={url} alt={`${alt} thumbnail ${i + 1}`} fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
