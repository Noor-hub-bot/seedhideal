// Pakistan-market formatting conventions (NFR-24).
// The design system writes prices as e.g. "PKR 48.5–51 lac" in Newsreader serif.

const LAC = 100_000;
const CRORE = 10_000_000;

/** "PKR 48.5 lac", "PKR 1.2 crore", "PKR 85,000" */
export function formatPkr(amount: number): string {
  if (amount >= CRORE) return `PKR ${trimZero(amount / CRORE)} crore`;
  if (amount >= LAC) return `PKR ${trimZero(amount / LAC)} lac`;
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

/** "PKR 48.5–51 lac" for price-guidance ranges */
export function formatPkrRange(min: number, max: number): string {
  if (min >= LAC && max < CRORE && min < CRORE) {
    return `PKR ${trimZero(min / LAC)}–${trimZero(max / LAC)} lac`;
  }
  return `${formatPkr(min)} – ${formatPkr(max)}`;
}

function trimZero(v: number): string {
  return (Math.round(v * 100) / 100).toString();
}

export function formatKm(km: number): string {
  return `${km.toLocaleString("en-PK")} km`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}
