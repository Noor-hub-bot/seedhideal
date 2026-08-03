"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export function PhotoLightbox({
  photos,
  startIndex,
  alt,
  onClose,
}: {
  photos: string[];
  startIndex: number;
  alt: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Adjusting state during render (React's recommended alternative to an effect here)
  // rather than setState-in-effect, which would trigger a cascading render.
  const [trackedIndex, setTrackedIndex] = useState(index);
  if (index !== trackedIndex) {
    setTrackedIndex(index);
    setZoomed(false);
  }

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || zoomed) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) prev();
      else next();
    }
    touchStartX.current = null;
  }

  if (photos.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-full p-1 text-2xl leading-none hover:bg-white/10"
        >
          ×
        </button>
      </div>

      <div
        className={`relative flex-1 overflow-hidden ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onClick={() => setZoomed((z) => !z)}
      >
        <Image
          src={photos[index]}
          alt={`${alt} photo ${index + 1}`}
          fill
          sizes="100vw"
          className={`object-contain transition-transform duration-200 ${zoomed ? "scale-[2]" : "scale-100"}`}
          priority
        />
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
  );
}
