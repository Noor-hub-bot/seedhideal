"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

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
   * a swipe is in progress. */
  autoplayMs?: number;
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
  onImageClick,
  priority = false,
  imageSizes = "100vw",
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchActive = useRef(false);

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  useEffect(() => {
    if (!autoplayMs || photos.length <= 1 || hovered) return;
    const timer = setInterval(() => {
      if (!touchActive.current) setIndex((i) => (i + 1) % photos.length);
    }, autoplayMs);
    return () => clearInterval(timer);
  }, [autoplayMs, photos.length, hovered]);

  // Reset to the first photo if the underlying photo set changes (e.g. a different
  // listing's card) rather than carrying over a stale index from a previous set of a
  // different length — adjusting state during render avoids a setState-in-effect
  // cascading render.
  const [trackedPhotos, setTrackedPhotos] = useState(photos);
  if (photos !== trackedPhotos) {
    setTrackedPhotos(photos);
    setIndex(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!enableKeyboard) return;
    if (e.key === "ArrowLeft") prev();
    else if (e.key === "ArrowRight") next();
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchActive.current = true;
  }
  function onTouchEnd(e: React.TouchEvent) {
    touchActive.current = false;
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta > 0) prev();
      else next();
    }
    touchStartX.current = null;
  }

  if (photos.length === 0) {
    return <div className={`photo-placeholder ${aspectClassName} ${roundedClassName} ${className}`}>vehicle photo</div>;
  }

  const arrowsVisible = showArrows === "always" || (showArrows === "hover" && hovered);

  return (
    <div className={className}>
      <div
        className={`group relative w-full overflow-hidden ${roundedClassName} ${aspectClassName} ${
          whiteBackground && objectFit === "contain" ? "bg-white" : ""
        }`}
        tabIndex={enableKeyboard ? 0 : undefined}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={() => onImageClick?.(index)}
          aria-label={onImageClick ? "View photo fullscreen" : `Photo ${index + 1} of ${photos.length}`}
          className="absolute inset-0"
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
