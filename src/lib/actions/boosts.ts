"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { auditLog, db, featuredPlans, listingBoosts, listings } from "@/db";
import { getSessionUser, requireStaff } from "@/lib/auth";
import { notify } from "@/lib/notify";

export type BoostFormState = { error?: string; requested?: boolean };

/** A listing with a pending or active boost can't be boosted again (mirrors the
 * one-active-listing-per-seller guard in marketplace.ts's getBlockingListing). */
async function hasOpenBoost(listingId: string): Promise<boolean> {
  const existing = await db
    .select({ id: listingBoosts.id })
    .from(listingBoosts)
    .where(
      and(eq(listingBoosts.listingId, listingId), inArray(listingBoosts.status, ["pending", "active"])),
    );
  return existing.length > 0;
}

export async function requestBoostAction(
  _prev: BoostFormState,
  formData: FormData,
): Promise<BoostFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in to boost a listing." };

  const listingId = String(formData.get("listingId") ?? "");
  const planId = String(formData.get("planId") ?? "");

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!listing || listing.sellerId !== user.id) return { error: "Listing not found." };
  if (listing.status !== "active") return { error: "Only a live listing can be featured." };

  const [plan] = await db
    .select()
    .from(featuredPlans)
    .where(and(eq(featuredPlans.id, planId), eq(featuredPlans.active, true)));
  if (!plan) return { error: "Choose a valid plan." };

  if (await hasOpenBoost(listingId)) {
    return { error: "This listing already has a featured request in progress." };
  }

  await db.insert(listingBoosts).values({
    listingId,
    planId,
    priority: plan.priority,
    status: "pending",
  });

  return { requested: true };
}

async function decideBoost(formData: FormData, status: "active" | "cancelled"): Promise<void> {
  const staff = await requireStaff();
  const boostId = String(formData.get("boostId"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (status === "cancelled" && !reason) return;

  const [existing] = await db.select().from(listingBoosts).where(eq(listingBoosts.id, boostId));
  if (!existing || existing.status !== "pending") return;

  const [listing] = await db.select().from(listings).where(eq(listings.id, existing.listingId));
  if (!listing) return;

  const now = new Date();
  if (status === "active") {
    const [plan] = await db.select().from(featuredPlans).where(eq(featuredPlans.id, existing.planId));
    const expiresAt = new Date(now.getTime() + (plan?.durationDays ?? 7) * 24 * 60 * 60 * 1000);
    await db
      .update(listingBoosts)
      .set({ status: "active", startAt: now, expiresAt, reviewerId: staff.id, reviewedAt: now, updatedAt: now })
      .where(eq(listingBoosts.id, boostId));
    await db
      .update(listings)
      .set({ featured: true, featuredPriority: existing.priority, updatedAt: now })
      .where(eq(listings.id, existing.listingId));
  } else {
    await db
      .update(listingBoosts)
      .set({ status: "cancelled", reviewerId: staff.id, reviewerNote: reason, reviewedAt: now, updatedAt: now })
      .where(eq(listingBoosts.id, boostId));
  }

  await db.insert(auditLog).values({
    actorId: staff.id,
    objectType: "listing_boost",
    objectId: boostId,
    action: status === "active" ? "approved" : "rejected",
    priorState: "pending",
    newState: status,
    reason: reason || null,
  });

  await notify({
    userId: listing.sellerId,
    type: status === "active" ? "boost_approved" : "boost_rejected",
    title:
      status === "active"
        ? `Your ${listing.make} ${listing.model} is now featured`
        : "Your featured listing request wasn't approved",
    body: reason || undefined,
    href: "/dashboard",
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/cars");
  revalidatePath("/");
}

export async function approveBoostAction(formData: FormData): Promise<void> {
  await decideBoost(formData, "active");
}

export async function rejectBoostAction(formData: FormData): Promise<void> {
  await decideBoost(formData, "cancelled");
}

/** Ends an active boost early — staff-only, e.g. to correct a mistaken approval. */
export async function cancelActiveBoostAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const boostId = String(formData.get("boostId"));

  const [existing] = await db.select().from(listingBoosts).where(eq(listingBoosts.id, boostId));
  if (!existing || existing.status !== "active") return;

  const now = new Date();
  await db
    .update(listingBoosts)
    .set({ status: "cancelled", reviewerId: staff.id, reviewedAt: now, updatedAt: now })
    .where(eq(listingBoosts.id, boostId));
  await db
    .update(listings)
    .set({ featured: false, featuredPriority: 0, updatedAt: now })
    .where(eq(listings.id, existing.listingId));

  await db.insert(auditLog).values({
    actorId: staff.id,
    objectType: "listing_boost",
    objectId: boostId,
    action: "cancelled",
    priorState: "active",
    newState: "cancelled",
  });

  revalidatePath("/admin");
  revalidatePath("/cars");
  revalidatePath("/");
}
