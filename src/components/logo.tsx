import Image from "next/image";

// Responsive SVG wordmark — replaces the previous raster lockup
// (public/logo.jpg, still kept on disk for OG/Twitter card images and the
// homepage's JSON-LD, which need a raster format; only the on-page logo
// changes here). "Seedhi" in ink, "Deal" in forest green on light
// backgrounds, set in the brand's Newsreader display face — this is exactly
// what BRANDING.md already specifies ("wordmark 'Deal' on light" = forest
// green) but which the raster asset never actually implemented.
//
// Both HeaderLogo/FooterLogo below accept an optional `src` — when an admin
// uploads a custom logo image (Website Settings > Media), that image renders
// in its place; with no upload, this coded wordmark remains the real default.
const VIEWBOX_WIDTH = 118;
const VIEWBOX_HEIGHT = 26;

function Wordmark({
  height,
  className = "",
  decorative = false,
}: {
  height: number;
  className?: string;
  decorative?: boolean;
}) {
  const width = Math.round((height / VIEWBOX_HEIGHT) * VIEWBOX_WIDTH);
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      width={width}
      height={height}
      overflow="visible"
      className={className}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "SeedhiDeal" })}
    >
      <text y="19" fontSize="20" className="font-display font-medium">
        <tspan fill="currentColor" className="text-foreground">
          Seedhi
        </tspan>
        <tspan fill="currentColor" className="text-brand">
          Deal
        </tspan>
      </text>
    </svg>
  );
}

export function HeaderLogo({ src, className = "" }: { src?: string | null; className?: string }) {
  // Wrapped in a Link with its own aria-label in header.tsx — decorative here
  // to avoid a redundant nested accessible name.
  if (src) return <Image src={src} alt="" width={140} height={26} className={`h-[26px] w-auto object-contain ${className}`} priority />;
  return <Wordmark height={26} decorative className={className} />;
}

export function FooterLogo({ src, siteName = "SeedhiDeal", className = "" }: { src?: string | null; siteName?: string; className?: string }) {
  // Not wrapped in a link — carries its own accessible name.
  if (src) return <Image src={src} alt={siteName} width={120} height={22} className={`h-[22px] w-auto object-contain ${className}`} />;
  return <Wordmark height={22} className={className} />;
}
