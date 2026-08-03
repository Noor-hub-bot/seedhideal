"use client";

import { useState } from "react";
import { PhotoCarousel, type PhotoCarouselProps } from "@/components/photo-carousel";
import { PhotoLightbox } from "@/components/photo-lightbox";

type CarouselChromeProps = Omit<
  PhotoCarouselProps,
  "photos" | "alt" | "index" | "onIndexChange" | "onImageClick"
>;

/** Owns the one shared "which photo is showing" index for a PhotoCarousel and its
 * fullscreen PhotoLightbox, so opening/closing the lightbox never desyncs from the inline
 * carousel or resets back to photo 1 — both are simply handed the same index/onIndexChange
 * rather than each keeping its own copy. Used both by the car detail page's full gallery
 * and by ListingCard's compact card carousel, each passing its own carousel chrome. */
export function PhotoGallery({
  photos,
  alt,
  className,
  ...carouselProps
}: { photos: string[]; alt: string; className?: string } & CarouselChromeProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    // A Fragment, not a wrapping div: PhotoCarousel's own outer element is what carries
    // `className` (e.g. a card's fixed-height box), and its sizing classes (like
    // aspectClassName="h-full") need to resolve against that element's REAL parent —
    // an extra unstyled div in between would collapse to 0 height, since the carousel's
    // own outer div has no in-flow content (only absolutely-positioned children) to give
    // it a natural size. PhotoLightbox is a `fixed inset-0` overlay regardless of nesting.
    <>
      <PhotoCarousel
        photos={photos}
        alt={alt}
        className={className}
        index={index}
        onIndexChange={setIndex}
        onImageClick={() => setLightboxOpen(true)}
        {...carouselProps}
      />
      {lightboxOpen && (
        <PhotoLightbox
          photos={photos}
          alt={alt}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
