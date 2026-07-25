import { revalidatePath } from "next/cache";
import { and, eq, lt } from "drizzle-orm";
import { auditLog, db, listings } from "@/db";
import { notify } from "@/lib/notify";

// Sweeps listings whose active period has ended so they stop showing as live. Platform
// agnostic — trigger it from any scheduler (Vercel Cron via vercel.json, GitHub Actions,
// a plain cron job) as long as it sends the CRON_SECRET bearer token.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const expired = await db
    .select({ id: listings.id, sellerId: listings.sellerId, make: listings.make, model: listings.model })
    .from(listings)
    .where(and(eq(listings.status, "active"), lt(listings.expiresAt, new Date())));

  for (const l of expired) {
    await db
      .update(listings)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(listings.id, l.id));
    await db.insert(auditLog).values({
      objectType: "listing",
      objectId: l.id,
      action: "expired",
      priorState: "active",
      newState: "expired",
    });
    await notify({
      userId: l.sellerId,
      type: "listing_expired",
      title: `Your ${l.make} ${l.model} listing has expired`,
      body: "Relist it from your dashboard if it's still for sale.",
      href: "/dashboard/listings",
    });
  }

  if (expired.length > 0) revalidatePath("/cars");
  return Response.json({ expired: expired.length });
}
