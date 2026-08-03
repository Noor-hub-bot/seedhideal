"use client";

import { useState } from "react";
import { PhotoCarousel } from "@/components/photo-carousel";
import { PhotoLightbox } from "@/components/photo-lightbox";

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div>
      <PhotoCarousel
        photos={photos}
        alt={alt}
        aspectClassName="aspect-video"
        objectFit="contain"
        whiteBackground
        showArrows="always"
        showDots
        showCounter
        showThumbnails
        enableKeyboard
        enableZoom
        priority
        imageSizes="(min-width: 1024px) 896px, 100vw"
        onImageClick={(i) => setLightboxIndex(i)}
      />
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          startIndex={lightboxIndex}
          alt={alt}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
