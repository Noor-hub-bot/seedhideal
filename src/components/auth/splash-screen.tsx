"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandMarkIcon } from "./icons";

const AUTO_ADVANCE_MS = 1800;

// Full-bleed brand moment shown once before /welcome. Auto-advances after a
// short delay, but any tap/click/key press skips straight there — this is a
// web app, not a native splash, so it must never trap someone who navigates
// here directly or via back/forward.
export function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/welcome"), AUTO_ADVANCE_MS);
    const skip = () => router.replace("/welcome");
    window.addEventListener("keydown", skip);
    window.addEventListener("click", skip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("click", skip);
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F172A] px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#14B8A6]/20 blur-3xl"
      />

      <div className="sd-anim-fade-up relative flex flex-col items-center">
        <div className="sd-anim-pulse mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#14B8A6]/15 text-[#14B8A6]">
          <BrandMarkIcon className="h-12 w-12" />
        </div>
        <p className="font-[family-name:var(--font-poppins)] text-3xl font-bold tracking-[-0.01em] text-white">
          SeedhiDeal
        </p>
        <p className="mt-2 text-[15px] text-white/60">Find Your Perfect Car</p>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center gap-4">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 rounded-full bg-[#14B8A6]" style={{ animation: "sd-splash-load 1.1s ease-in-out infinite" }} />
        </div>
        <p className="text-xs text-white/40">Tap to continue</p>
      </div>

      <style>{`
        @keyframes sd-splash-load {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sd-anim-pulse { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
