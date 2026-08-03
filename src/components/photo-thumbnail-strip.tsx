"use client";

import Image from "next/image";

/** Shared thumbnail row for PhotoCarousel's inline gallery mode and PhotoLightbox's
 * fullscreen mode — same click-to-jump/active-highlight behavior in both places rather
 * than two copies of the same markup. */
export function PhotoThumbnailStrip({
  photos,
  alt,
  index,
  onSelect,
  className = "",
  thumbClassName = "h-16 w-20",
}: {
  photos: string[];
  alt: string;
  index: number;
  onSelect: (index: number) => void;
  className?: string;
  thumbClassName?: string;
}) {
  if (photos.length <= 1) return null;
  return (
    <div className={`flex gap-2 overflow-x-auto ${className}`}>
      {photos.map((url, i) => (
        <button
          key={url}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(i);
          }}
          aria-label={`Show photo ${i + 1}`}
          aria-current={i === index}
          className={`relative shrink-0 overflow-hidden rounded-input border-2 ${thumbClassName} ${
            i === index ? "border-brand" : "border-transparent"
          }`}
        >
          <Image src={url} alt={`${alt} thumbnail ${i + 1}`} fill className="object-cover" sizes="80px" />
        </button>
      ))}
    </div>
  );
}
