// Production logo lockup at public/logo.jpg (1536x1024 raster export, solid
// black background): car silhouette + wordmark + "BUY SELL DRIVE" badge +
// tagline, all baked into one image. Wrapped in a dark chip so the flat
// black background reads as an intentional badge frame, not a stray box
// against the site's light header/footer. Do not stretch or recolor.
import Image from "next/image";

// Intrinsic size is 1536x1024 for the logo.jpg lockup.
const LOCKUP_ASPECT = 1536 / 1024;

export function HeaderLogo({ className = "" }: { className?: string }) {
  const height = 56;
  return (
    <span className={`inline-flex items-center rounded-xl bg-black px-3 py-2 ${className}`}>
      <Image
        src="/logo.jpg"
        alt="SeedhiDeal"
        width={Math.round(height * LOCKUP_ASPECT)}
        height={height}
        priority
        style={{ height, width: "auto" }}
      />
    </span>
  );
}

export function FooterLogo({ className = "" }: { className?: string }) {
  const height = 36;
  return (
    <span className={`inline-flex items-center rounded-lg bg-black px-2.5 py-1.5 ${className}`}>
      <Image
        src="/logo.jpg"
        alt="SeedhiDeal"
        width={Math.round(height * LOCKUP_ASPECT)}
        height={height}
        style={{ height, width: "auto" }}
      />
    </span>
  );
}
