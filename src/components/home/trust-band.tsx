import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { db, verificationCases } from "@/db";

// Shared data layer for the "trust" content (Statistics + Verified Sellers).
// Both previously ran this exact same query independently — this
// consolidates it into one cached lookup, reused by both, avoiding a
// duplicate DB round-trip. A full visual/positional merge into one TrustBand
// section is deferred: the two sections aren't currently adjacent on the
// homepage (Featured Dealers and Reviews sit between them), and merging them
// visually would require reordering the page — out of scope for a
// pixel-perfect-preservation milestone. This file starts as the shared data
// helper only; no rendering component yet.
export const getVerifiedSellerIds = unstable_cache(
  async () => {
    const rows = await db
      .select({ userId: verificationCases.userId })
      .from(verificationCases)
      .where(eq(verificationCases.status, "verified"));
    return [...new Set(rows.map((r) => r.userId))];
  },
  ["home-verified-seller-ids"],
  { revalidate: 60 },
);
