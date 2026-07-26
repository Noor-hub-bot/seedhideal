import { Poppins } from "next/font/google";

// Poppins is scoped to this route group only (via the CSS var below) — the rest of
// the site keeps Newsreader/Inter untouched. See src/components/auth/ui.tsx for
// where --font-poppins gets used.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${poppins.variable} flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10`}>
      {children}
    </div>
  );
}
