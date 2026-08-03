"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoLightbox } from "@/components/photo-lightbox";

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (photos.length === 0) {
    // Fallback for older/seeded listings created before photo upload existed
    return <div className="photo-placeholder h-72 rounded-card">vehicle photo</div>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label="View photo fullscreen"
        className="relative block h-72 w-full overflow-hidden rounded-card"
      >
        <Image src={photos[active]} alt={alt} fill className="object-cover" priority />
      </button>
      {lightboxOpen && (
        <PhotoLightbox
          photos={photos}
          startIndex={active}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-input border-2 ${
                i === active ? "border-brand" : "border-transparent"
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
