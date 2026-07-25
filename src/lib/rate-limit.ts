import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let calls = 0;

/** In-memory fixed-window rate limiter. Fine for a single-instance deployment; a
 * multi-instance deployment would need a shared store (e.g. Redis/Upstash) instead. */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  calls++;
  if (calls % 100 === 0) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

/** Best-effort client IP from proxy headers — only meaningful behind a real proxy (e.g. Vercel). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
