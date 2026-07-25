/**
 * Wraps a homepage-section data fetch so a transient DB failure degrades to
 * "nothing to show" instead of an error overlay. Every section already hides
 * gracefully when its data is legitimately empty (no featured listings, no
 * approved reviews, ...) — this extends the same behavior to "couldn't fetch
 * it this time", which matters more now that the homepage fires many
 * concurrent queries per request across independent Suspense boundaries.
 */
export async function safeSection<T>(fetcher: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}
