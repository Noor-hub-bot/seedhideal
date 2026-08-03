"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;
const WHEEL_SENSITIVITY = 0.0015;
const KEYBOARD_ZOOM_STEP = 0.5;
const DOUBLE_TAP_MS = 300;
const MOVE_THRESHOLD = 6;
const SWIPE_THRESHOLD = 40;
// Treated as "not zoomed" below this — avoids float drift (e.g. 1.0000000002) ever
// registering as a live zoom state.
const ZOOM_EPSILON = 1.01;

type Transform = { scale: number; x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampPan(x: number, y: number, scale: number, width: number, height: number) {
  if (scale <= 1) return { x: 0, y: 0 };
  const maxX = (width * (scale - 1)) / 2;
  const maxY = (height * (scale - 1)) / 2;
  return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
}

export interface UseImageZoomOptions {
  /** Fired on a genuine single click/tap — not a drag, not half of a double-click/tap, and
   * never while zoomed (the carousel uses this to open the fullscreen lightbox). */
  onSingleClick?: () => void;
  /** Fired on a horizontal swipe, but only while NOT zoomed (while zoomed, the same
   * gesture pans the image instead — see the touchmove handling below). */
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Fired on ArrowLeft/ArrowRight, but only while NOT zoomed (while zoomed, arrow keys
   * don't navigate photos — only +/-/Escape act, per spec). */
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  disabled?: boolean;
}

export interface UseImageZoomResult {
  /** The bounding box for the zoomable area — also used to measure width/height for pan
   * clamping. Every gesture (wheel, click/tap, drag, pinch, keyboard) is attached to this
   * element internally; just pass `ref={containerRef}` on it (a focusable element, e.g. a
   * <button>, so keyboard shortcuts work). */
  containerRef: React.RefObject<HTMLElement | null>;
  /** The element the transform is written to — wrap the actual <Image> in this. */
  imageRef: React.RefObject<HTMLElement | null>;
  /** True once scale is meaningfully above 1x. The only state this hook re-renders on,
   * besides `dragging`. */
  zoomed: boolean;
  /** True for the whole duration of any press (mouse or touch), whether it turns out to be
   * a zoomed pan or a plain swipe/tap — use this to pause autoplay while the user is
   * touching the carousel. Combine with `zoomed` for a "grabbing" cursor specifically. */
  dragging: boolean;
  /** Reset to 1x/centered — call from an effect when the active photo changes. */
  reset: () => void;
}

/** Wheel/double-click/pinch/drag zoom-and-pan for a single image, applied entirely via
 * direct `style.transform` writes (translate + scale) rather than React state — so
 * gestures stay smooth regardless of render cost elsewhere on the page. `zoomed` and
 * `dragging` are the only React state here, and both only flip at the coarse start/end of
 * a gesture, never per pixel or per frame.
 *
 * Every DOM listener is attached natively (`addEventListener`, not JSX props) inside one
 * effect on `containerRef`. Two reasons: (1) wheel/touchmove must be non-passive to
 * preventDefault the browser's own scroll/zoom, which React's synthetic onWheel/onTouchMove
 * can't do (React attaches those passively by default); (2) returning ref-touching handler
 * functions for a consumer to spread onto JSX trips the React Compiler's
 * react-hooks/refs rule ("cannot access ref value during render"), since it can't prove
 * the returned function reference isn't itself a ref read. Owning every gesture internally
 * also means zoom-vs-navigate exclusivity (swipe/arrow-keys only act when not zoomed) is
 * enforced in one place instead of coordinated across two separate systems — see
 * onSwipeLeft/onSwipeRight/onArrowLeft/onArrowRight below, which is how the consumer
 * (PhotoCarousel) still gets to run its own photo-navigation logic. */
export function useImageZoom({
  onSingleClick,
  onSwipeLeft,
  onSwipeRight,
  onArrowLeft,
  onArrowRight,
  disabled,
}: UseImageZoomOptions = {}): UseImageZoomResult {
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLElement>(null);
  const transform = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const [zoomed, setZoomed] = useState(false);
  const zoomedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const moved = useRef(false);
  const lastTapAt = useRef(0);
  const pendingClick = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useEffectEvent: always calls the latest onSingleClick/onSwipeLeft/etc. from whatever
  // render they were last passed in, but keeps a stable identity — so the listener-setup
  // effect below never needs to re-run (i.e. tear down and reattach every DOM listener)
  // just because the consumer re-rendered with a new inline callback.
  const emitSingleClick = useEffectEvent(() => onSingleClick?.());
  const emitSwipeLeft = useEffectEvent(() => onSwipeLeft?.());
  const emitSwipeRight = useEffectEvent(() => onSwipeRight?.());
  const emitArrowLeft = useEffectEvent(() => onArrowLeft?.());
  const emitArrowRight = useEffectEvent(() => onArrowRight?.());

  const applyTransform = useCallback(() => {
    const el = imageRef.current;
    if (!el) return;
    const { scale, x, y } = transform.current;
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, []);

  const commit = useCallback(
    (scale: number, x: number, y: number) => {
      transform.current = { scale, x, y };
      applyTransform();
      const nowZoomed = scale > ZOOM_EPSILON;
      if (nowZoomed !== zoomedRef.current) {
        zoomedRef.current = nowZoomed;
        setZoomed(nowZoomed);
      }
    },
    [applyTransform],
  );

  const reset = useCallback(() => {
    dragStart.current = null;
    pinch.current = null;
    commit(1, 0, 0);
  }, [commit]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    /** Shared math behind wheel, pinch, and double-click/tap zoom: rescale to `newScale`
     * while keeping the point at (clientX, clientY) visually anchored. */
    function zoomToPoint(newScale: number, clientX: number, clientY: number) {
      const rect = el!.getBoundingClientRect();
      const clamped = clamp(newScale, MIN_SCALE, MAX_SCALE);
      const { scale: oldScale, x: oldX, y: oldY } = transform.current;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const offsetX = clientX - cx - oldX;
      const offsetY = clientY - cy - oldY;
      const ratio = clamped / oldScale;
      const rawX = oldX - offsetX * (ratio - 1);
      const rawY = oldY - offsetY * (ratio - 1);
      const { x, y } = clampPan(rawX, rawY, clamped, rect.width, rect.height);
      commit(clamped, x, y);
    }

    function zoomKeepingCenter(newScale: number) {
      const rect = el!.getBoundingClientRect();
      const clamped = clamp(newScale, MIN_SCALE, MAX_SCALE);
      const { x, y } = clampPan(transform.current.x, transform.current.y, clamped, rect.width, rect.height);
      commit(clamped, x, y);
    }

    function toggleZoomAt(clientX: number, clientY: number) {
      if (zoomedRef.current) reset();
      else zoomToPoint(DOUBLE_TAP_SCALE, clientX, clientY);
    }

    function scheduleClick(clientX: number, clientY: number) {
      const now = Date.now();
      const isDouble = now - lastTapAt.current < DOUBLE_TAP_MS;
      lastTapAt.current = isDouble ? 0 : now;
      if (pendingClick.current) {
        clearTimeout(pendingClick.current);
        pendingClick.current = null;
      }
      if (isDouble) {
        toggleZoomAt(clientX, clientY);
        return;
      }
      pendingClick.current = setTimeout(() => {
        pendingClick.current = null;
        if (!zoomedRef.current) emitSingleClick();
      }, DOUBLE_TAP_MS);
    }

    function pressStart(x: number, y: number) {
      moved.current = false;
      swipeStart.current = { x, y };
      dragStart.current = zoomedRef.current ? { x, y, panX: transform.current.x, panY: transform.current.y } : null;
    }

    function pan(x: number, y: number) {
      if (!dragStart.current) return;
      const rect = el!.getBoundingClientRect();
      const dx = x - dragStart.current.x;
      const dy = y - dragStart.current.y;
      if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) moved.current = true;
      const { x: px, y: py } = clampPan(
        dragStart.current.panX + dx,
        dragStart.current.panY + dy,
        transform.current.scale,
        rect.width,
        rect.height,
      );
      commit(transform.current.scale, px, py);
    }

    function pressEnd(x: number, y: number) {
      const wasZoomed = zoomedRef.current;
      dragStart.current = null;
      setDragging(false);
      if (!moved.current) {
        scheduleClick(x, y);
      } else if (!wasZoomed && swipeStart.current) {
        const dx = x - swipeStart.current.x;
        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          if (dx > 0) emitSwipeRight();
          else emitSwipeLeft();
        }
      }
      swipeStart.current = null;
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      zoomToPoint(transform.current.scale * (1 - e.deltaY * WHEEL_SENSITIVITY), e.clientX, e.clientY);
    }

    function onMouseDown(e: MouseEvent) {
      pressStart(e.clientX, e.clientY);
      setDragging(true);
    }
    function onMouseMove(e: MouseEvent) {
      if (dragStart.current) pan(e.clientX, e.clientY);
    }
    function onMouseUp(e: MouseEvent) {
      pressEnd(e.clientX, e.clientY);
    }
    function onMouseLeave() {
      dragStart.current = null;
      setDragging(false);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        pinch.current = { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), scale: transform.current.scale };
        return;
      }
      if (e.touches.length === 1) {
        pressStart(e.touches[0].clientX, e.touches[0].clientY);
        setDragging(true);
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        if (!pinch.current) {
          pinch.current = { distance, scale: transform.current.scale };
          return;
        }
        moved.current = true;
        zoomToPoint(pinch.current.scale * (distance / pinch.current.distance), midX, midY);
        return;
      }
      if (e.touches.length === 1 && dragStart.current) {
        e.preventDefault();
        pan(e.touches[0].clientX, e.touches[0].clientY);
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length === 0) pinch.current = null;
      if (e.touches.length < 2) {
        const touch = e.changedTouches[0];
        if (touch) pressEnd(touch.clientX, touch.clientY);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      // The zoomable element is role="button"/tabIndex=0 rather than a real <button> (a
      // real button's native click would double-fire alongside this hook's own click
      // detection), so Enter/Space activation has to be wired up by hand per WAI-ARIA.
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!zoomedRef.current) emitSingleClick();
        return;
      }
      if (e.key === "Escape") {
        if (zoomedRef.current) {
          e.stopPropagation();
          reset();
        }
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomKeepingCenter(transform.current.scale + KEYBOARD_ZOOM_STEP);
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomKeepingCenter(transform.current.scale - KEYBOARD_ZOOM_STEP);
        return;
      }
      if (zoomedRef.current) return; // arrow keys only navigate photos at 1x
      if (e.key === "ArrowLeft") emitArrowLeft();
      else if (e.key === "ArrowRight") emitArrowRight();
    }

    // wheel/touchmove must be non-passive to preventDefault the browser's own
    // scroll/pinch-zoom — React's synthetic onWheel/onTouchMove can't do this (attached
    // passively by default for scroll perf), so these are native listeners.
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("keydown", onKeyDown);
    };
    // emitSingleClick/emitSwipeLeft/emitSwipeRight/emitArrowLeft/emitArrowRight are
    // useEffectEvent functions — guaranteed stable identity, deliberately excluded here.
  }, [commit, disabled, reset]);

  return { containerRef, imageRef, zoomed, dragging, reset };
}
