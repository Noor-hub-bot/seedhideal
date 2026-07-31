import { Poppins } from "next/font/google";

// Poppins is scoped to this route group only (via the CSS var below) — the rest of
// the site keeps Newsreader/Inter untouched. See src/components/auth/ui.tsx for
// where --font-poppins gets used.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Shared motion vocabulary for every screen in this route group (cards, icon
// badges, error banners, the splash logo). Centralized here — the single
// layout every auth page mounts inside — rather than duplicated per screen.
// Reduced-motion users get the end state instantly, no animation.
const AUTH_ANIMATIONS = `
  @keyframes sd-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes sd-pop { 0% { opacity: 0; transform: scale(0.82); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes sd-pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(20,184,166,0.32); }
    70% { box-shadow: 0 0 0 16px rgba(20,184,166,0); }
    100% { box-shadow: 0 0 0 0 rgba(20,184,166,0); }
  }
  .sd-anim-fade-up { animation: sd-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both; }
  .sd-anim-pop { animation: sd-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
  .sd-anim-pulse { animation: sd-pulse-ring 2.4s cubic-bezier(0.4,0,0.6,1) infinite; }
  @media (prefers-reduced-motion: reduce) {
    .sd-anim-fade-up, .sd-anim-pop, .sd-anim-pulse { animation: none !important; }
  }
`;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${poppins.variable} relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-10`}
    >
      <style>{AUTH_ANIMATIONS}</style>
      {/* Soft decorative glow — purely ambient, never behind interactive content */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#14B8A6]/10 blur-3xl"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
