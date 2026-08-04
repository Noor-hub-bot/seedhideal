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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "just now", "5 minutes ago", "3 hours ago", "2 days ago" — falls back to a plain
 * date once it's further away than a week, where a relative count stops being useful. */
export function formatRelativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  if (diffMs < MINUTE) return "just now";
  if (diffMs < HOUR) {
    const n = Math.floor(diffMs / MINUTE);
    return `${n} minute${n === 1 ? "" : "s"} ago`;
  }
  if (diffMs < DAY) {
    const n = Math.floor(diffMs / HOUR);
    return `${n} hour${n === 1 ? "" : "s"} ago`;
  }
  if (diffMs < WEEK) {
    const n = Math.floor(diffMs / DAY);
    return `${n} day${n === 1 ? "" : "s"} ago`;
  }
  return formatDate(d);
}
