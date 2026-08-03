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
  /** "hover-desktop" is CSS-only (no JS hover state): always visible at small viewport
   * widths (touch-friendly) and only on hover at md+ (desktop). Cards use this; the full
   * gallery uses "always". */
  showArrows?: "always" | "hover" | "hover-desktop" | "none";
  showDots?: boolean;
  /** "below" (default) renders dots in their own row under the image, as the gallery
   * does. "overlay" places them over the bottom edge of the image itself — used by cards,
   * which have no room for a separate row. */
  dotsPosition?: "below" | "overlay";
  showCounter?: boolean;
  showThumbnails?: boolean;
  enableKeyboard?: boolean;
  /** Auto-advance interval in ms; 0/undefined disables autoplay. Pauses on hover and while
   * a swipe/drag is in progress. */
  autoplayMs?: number;
  /** Fades the incoming photo in (~300ms) on every index change instead of a hard cut.
   * Cards enable this; the full gallery leaves it off since arrows/dots there already read
   * as instant by design. */
  fadeTransition?: boolean;
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
  dotsPosition = "below",
  showCounter = false,
  showThumbnails = false,
  enableKeyboard = false,
  autoplayMs = 0,
  fadeTransition = false,
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
  // "hover-desktop" is CSS-only (group-hover) so it works on touch devices, which never
  // fire mouseenter: always-on below md, hover-only at md+.
  const arrowVisibilityClass =
    showArrows === "hover-desktop"
      ? "opacity-100 md:opacity-0 md:group-hover:opacity-100"
      : arrowsVisible
        ? "opacity-100"
        : "opacity-0";
  const isClickable = enableZoom || !!onImageClick;
  const dots = showDots && photos.length > 1 && (
    <div
      className={
        dotsPosition === "overlay"
          ? "pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5"
          : "mt-2.5 flex justify-center gap-1.5"
      }
    >
      {photos.map((url, i) => (
        <button
          key={url}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIndex(i);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={`Go to photo ${i + 1}`}
          aria-current={i === index}
          className={`pointer-events-auto h-1.5 rounded-full transition-all ${
            dotsPosition === "overlay" ? "shadow-sm" : ""
          } ${
            i === index
              ? "w-5 bg-brand"
              : dotsPosition === "overlay"
                ? "w-1.5 bg-white/70 hover:bg-white"
                : "w-1.5 bg-neutral-chip hover:bg-border-input"
          }`}
        />
      ))}
    </div>
  );
  const cursorClass = enableZoom
    ? zoomed && dragging
      ? "cursor-grabbing"
      : zoomed
        ? "cursor-zoom-out"
        : "cursor-zoom-in"
    : onImageClick
      ? "cursor-pointer"
      : "";

  return (
    <div className={className}>
      <div
        className={`group relative w-full overflow-hidden ${roundedClassName} ${aspectClassName} ${
          whiteBackground && objectFit === "contain" ? "bg-white" : ""
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* The zoom hook's ref is attached here UNCONDITIONALLY — its listeners cover
            swipe-to-navigate and arrow-key navigation too, not just zoom, and those need
            to work whether or not zoom itself is enabled (e.g. the homepage hero has
            enableZoom=false but still needs swipe). Only a real click PURPOSE
            (enableZoom, or an onImageClick for the lightbox) makes this a role="button":
            the hook owns click detection itself (to disambiguate single/double-click
            from a drag), so a real <button>'s native click would double-fire alongside
            it — a plain div lets a card's wrapping <Link> handle navigation normally. */}
        {isClickable ? (
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
                key={fadeTransition ? index : undefined}
                src={photos[index]}
                alt={`${alt} photo ${index + 1}`}
                fill
                priority={priority}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                sizes={imageSizes}
                className={`${objectFit === "contain" ? "object-contain" : "object-cover"} ${
                  fadeTransition ? "carousel-photo-fade" : ""
                }`}
              />
            </div>
          </div>
        ) : (
          <div ref={zoomContainerRef as React.RefObject<HTMLDivElement>} className="absolute inset-0 overflow-hidden">
            <div
              ref={zoomImageRef as React.RefObject<HTMLDivElement>}
              className="absolute inset-0"
              style={{ transformOrigin: "center" }}
            >
              <Image
                key={fadeTransition ? index : undefined}
                src={photos[index]}
                alt={`${alt} photo ${index + 1}`}
                fill
                priority={priority}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                sizes={imageSizes}
                className={`${objectFit === "contain" ? "object-contain" : "object-cover"} ${
                  fadeTransition ? "carousel-photo-fade" : ""
                }`}
              />
            </div>
          </div>
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
              className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1.5 text-lg text-foreground shadow transition-opacity hover:bg-white ${arrowVisibilityClass}`}
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
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1.5 text-lg text-foreground shadow transition-opacity hover:bg-white ${arrowVisibilityClass}`}
            >
              ›
            </button>
          </>
        )}

        {dotsPosition === "overlay" && dots}
      </div>

      {dotsPosition === "below" && dots}

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
