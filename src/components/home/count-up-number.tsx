"use client";

import { useEffect, useState } from "react";

const DEFAULT_DURATION_MS = 1200;

/** Animates from 0 up to `value` on mount via requestAnimationFrame (no layout-shifting
 * IntersectionObserver setup needed — the stats band sits early enough on the page that a
 * mount-triggered count-up reads naturally). Skips straight to the final value when the
 * visitor has requested reduced motion. */
export function CountUpNumber({ value, durationMs = DEFAULT_DURATION_MS }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Both branches set state from inside a requestAnimationFrame callback (a real async
    // platform callback), never synchronously in the effect body itself, per
    // react-hooks/set-state-in-effect.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span>{display.toLocaleString("en-PK")}</span>;
}
