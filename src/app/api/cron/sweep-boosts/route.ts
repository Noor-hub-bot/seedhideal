import { revalidatePath } from "next/cache";
import { and, eq, lt } from "drizzle-orm";
import { auditLog, db, listingBoosts, listings } from "@/db";

// Sibling to /api/cron/sweep-listings — same bearer-token pattern, same
// scheduler-agnostic trigger (Vercel Cron via vercel.json, or any other).
// Expires active boosts whose period has ended, clearing the fast-read
// featured/featuredPriority cache on the listing.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const expired = await db
    .select({ id: listingBoosts.id, listingId: listingBoosts.listingId })
    .from(listingBoosts)
    .where(and(eq(listingBoosts.status, "active"), lt(listingBoosts.expiresAt, new Date())));

  for (const boost of expired) {
    await db
      .update(listingBoosts)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(listingBoosts.id, boost.id));
    await db
      .update(listings)
      .set({ featured: false, featuredPriority: 0, updatedAt: new Date() })
      .where(eq(listings.id, boost.listingId));
    await db.insert(auditLog).values({
      objectType: "listing_boost",
      objectId: boost.id,
      action: "expired",
      priorState: "active",
      newState: "expired",
    });
  }

  if (expired.length > 0) {
    revalidatePath("/cars");
    revalidatePath("/");
  }
  return Response.json({ expired: expired.length });
}
