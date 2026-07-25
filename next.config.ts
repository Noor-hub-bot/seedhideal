import path from "path";
import type { NextConfig } from "next";

const storagePublicUrl = process.env.STORAGE_PUBLIC_URL_BASE;

function storageOrigin(): string {
  if (!storagePublicUrl) return "";
  try {
    return new URL(storagePublicUrl).origin;
  } catch {
    return "";
  }
}

// Next's documented "without nonces" CSP (see docs/app/guides/content-security-policy) —
// simpler than nonce+proxy, which would force every page to dynamic rendering.
const isDev = process.env.NODE_ENV === "development";
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: ${storageOrigin()};
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Hides the Next.js dev-mode route indicator badge (the "N" icon overlay);
  // it's a framework dev tool, not part of the site's UI.
  devIndicators: false,
  // Pins the workspace root to this folder so Turbopack stops guessing
  // between this lockfile and the stray one in the parent directory.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // Required so next/image can serve the local logo SVGs.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: storagePublicUrl ? [new URL(`${storagePublicUrl}/**`)] : [],
  },
  experimental: {
    serverActions: {
      // Listing photo uploads (up to 8 photos) go through the sell form's server action.
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
