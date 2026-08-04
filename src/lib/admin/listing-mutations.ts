// Core staff-initiated listing mutations — deliberately NOT a "use server" file (see
// src/lib/admin/user-mutations.ts for why: every exported async function in a "use
// server" file becomes its own client-callable RPC endpoint). Reuses the same
// transitionListing/deleteListingRecords core src/lib/actions/marketplace.ts already
// exports for seller-initiated actions, rather than a second copy of that logic — only
// the legality checks differ (staff can act on any listing, not just their own, and the
// allowed prior states are enforcement-oriented rather than seller-lifecycle-oriented).
import { and, desc, eq, inArray } from "drizzle-orm";
import { auditLog, db, featuredPlans, listingBoosts, listings } from "@/db";
import { notify } from "@/lib/notify";
import { deleteListingRecords, transitionListing } from "@/lib/actions/marketplace";

export type ListingActionResult = { ok: true; message: string } | { ok: false; error: string };

const MODERATION_STATES = new Set(["submitted", "under_review", "correction"]);
const LIVE_STATES = new Set(["active", "paused"]);

async function loadListing(listingId: string) {
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
  return listing ?? null;
}

export async function approveListingAsStaff(staffId: string, listingId: string): Promise<ListingActionResult> {
  const listing = await loadListing(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (!MODERATION_STATES.has(listing.status)) return { ok: false, error: `Cannot approve a listing that is ${listing.status}.` };

  await db
    .update(listings)
    .set({ status: "active", approvedAt: new Date(), expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), rejectionReason: null, updatedAt: new Date() })
    .where(eq(listings.id, listingId));
  await db.insert(auditLog).values({ actorId: staffId, objectType: "listing", objectId: listingId, action: "approved", priorState: listing.status, newState: "active" });
  await notify({ userId: listing.sellerId, type: "listing_approved", title: "Your listing is live", href: "/dashboard" });

  return { ok: true, message: "Listing approved." };
}

export async function rejectListingAsStaff(staffId: string, listingId: string, reason: string): Promise<ListingActionResult> {
  if (!reason.trim()) return { ok: false, error: "A reason is required." };
  const listing = await loadListing(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (!MODERATION_STATES.has(listing.status)) return { ok: false, error: `Cannot reject a listing that is ${listing.status}.` };

  await db.update(listings).set({ status: "correction", rejectionReason: reason, updatedAt: new Date() }).where(eq(listings.id, listingId));
  await db.insert(auditLog).values({ actorId: staffId, objectType: "listing", objectId: listingId, action: "correction_requested", priorState: listing.status, newState: "correction", reason });
  await notify({ userId: listing.sellerId, type: "listing_correction", title: "Your listing needs a correction", body: reason, href: "/dashboard" });

  return { ok: true, message: "Listing sent back for correction." };
}

export async function suspendListingAsStaff(staffId: string, listingId: string, reason?: string): Promise<ListingActionResult> {
  const listing = await loadListing(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (!LIVE_STATES.has(listing.status)) return { ok: false, error: `Cannot suspend a listing that is ${listing.status}.` };

  await transitionListing(listingId, staffId, listing.status, { status: "suspended" }, "suspended");
  if (reason?.trim()) {
    await db.insert(auditLog).values({ actorId: staffId, objectType: "listing", objectId: listingId, action: "suspend_reason", newState: "suspended", reason: reason.trim() });
  }
  await notify({ userId: listing.sellerId, type: "listing_suspended", title: "Your listing has been suspended", body: reason?.trim() || undefined, href: "/dashboard" });

  return { ok: true, message: "Listing suspended." };
}

export async function restoreListingAsStaff(staffId: string, listingId: string): Promise<ListingActionResult> {
  const listing = await loadListing(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (listing.status !== "suspended") return { ok: false, error: `Cannot restore a listing that is ${listing.status}.` };

  await transitionListing(listingId, staffId, listing.status, { status: "active" }, "restored");
  await notify({ userId: listing.sellerId, type: "listing_restored", title: "Your listing is active again", href: "/dashboard" });

  return { ok: true, message: "Listing restored." };
}

export async function pauseListingAsStaff(staffId: string, listingId: string): Promise<ListingActionResult> {
  const listing = await loadListing(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (listing.status !== "active") return { ok: false, error: `Cannot pause a listing that is ${listing.status}.` };

  await transitionListing(listingId, staffId, listing.status, { status: "paused" }, "paused");
  return { ok: true, message: "Listing paused." };
}

export async function resumeListingAsStaff(staffId: string, listingId: string): Promise<ListingActionResult> {
  const listing = await loadListing(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (listing.status !== "paused") return { ok: false, error: `Cannot resume a listing that is ${listing.status}.` };

  await transitionListing(listingId, staffId, listing.status, { status: "active" }, "resumed");
  return { ok: true, message: "Listing resumed." };
}

export async function markSoldAsStaff(staffId: string, listingId: string): Promise<ListingActionResult> {
  const listing = await loadListing(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (!LIVE_STATES.has(listing.status)) return { ok: false, error: `Cannot mark sold a listing that is ${listing.status}.` };

  await transitionListing(listingId, staffId, listing.status, { status: "sold", soldAt: new Date() }, "marked_sold");
  return { ok: true, message: "Listing marked sold." };
}

/** A real hard DELETE is available to staff (unlike suspend/restore, this isn't
 * reversible) — reuses the exact same multi-table batch delete the seller-facing
 * deleteListingAction uses, just without the ownership check or redirect. Staff
 * validation itself already happened one layer up, in admin-listings.ts's
 * deleteListingAction, via requireStaff() — the "use server" wrapper is the only place
 * that check is allowed to live (see the file-level comment at the top of
 * listing-mutations.ts). */
export async function deleteListingAsStaff(staffId: string, listingId: string): Promise<ListingActionResult> {
  console.log(`[deleteListingAsStaff:${listingId}] loading listing: before — staffId=${staffId}`);
  let listing;
  try {
    listing = await loadListing(listingId);
  } catch (e) {
    console.error(`[deleteListingAsStaff:${listingId}] FAILED loading listing:`, e);
    return { ok: false, error: "Could not load this listing. Please try again." };
  }
  console.log(`[deleteListingAsStaff:${listingId}] loading listing: after — found=${!!listing} status=${listing?.status ?? "n/a"}`);
  if (!listing) return { ok: false, error: "Listing not found." };

  const result = await deleteListingRecords(listingId, listing.status, staffId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, message: "Listing deleted." };
}

async function hasOpenBoost(listingId: string): Promise<boolean> {
  const existing = await db
    .select({ id: listingBoosts.id })
    .from(listingBoosts)
    .where(and(eq(listingBoosts.listingId, listingId), inArray(listingBoosts.status, ["pending", "active"])));
  return existing.length > 0;
}

/** Admin-initiated featuring skips the seller-request-then-approve flow (boosts.ts'
 * requestBoostAction + decideBoost) — staff decide unilaterally — but still goes through
 * the exact same listingBoosts + listings.featured/featuredPriority mechanism, using
 * whichever active featuredPlans row currently has the highest priority, so there's
 * still one real, auditable boost record behind every featured badge, not a bare flag
 * flip that would drift from what the rest of the app (sweep-boosts, Featured Analytics)
 * expects to find in listingBoosts. */
export async function featureListingAsStaff(staffId: string, listingId: string): Promise<ListingActionResult> {
  const listing = await loadListing(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (listing.status !== "active") return { ok: false, error: "Only a live listing can be featured." };
  if (listing.featured) return { ok: true, message: "Listing is already featured." };
  if (await hasOpenBoost(listingId)) return { ok: false, error: "This listing already has a featured request in progress." };

  const [plan] = await db.select().from(featuredPlans).where(eq(featuredPlans.active, true)).orderBy(desc(featuredPlans.priority)).limit(1);
  if (!plan) return { ok: false, error: "No active featured plan is configured." };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const [boost] = await db
    .insert(listingBoosts)
    .values({ listingId, planId: plan.id, priority: plan.priority, status: "active", startAt: now, expiresAt, reviewerId: staffId, reviewedAt: now })
    .returning();
  await db.update(listings).set({ featured: true, featuredPriority: plan.priority, updatedAt: now }).where(eq(listings.id, listingId));

  await db.insert(auditLog).values({ actorId: staffId, objectType: "listing_boost", objectId: boost.id, action: "approved", newState: "active" });
  await notify({ userId: listing.sellerId, type: "boost_approved", title: `Your ${listing.make} ${listing.model} is now featured`, href: "/dashboard" });

  return { ok: true, message: "Listing featured." };
}

export async function unfeatureListingAsStaff(staffId: string, listingId: string): Promise<ListingActionResult> {
  const listing = await loadListing(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (!listing.featured) return { ok: true, message: "Listing is already not featured." };

  const [activeBoost] = await db
    .select()
    .from(listingBoosts)
    .where(and(eq(listingBoosts.listingId, listingId), eq(listingBoosts.status, "active")));

  const now = new Date();
  if (activeBoost) {
    await db.update(listingBoosts).set({ status: "cancelled", reviewerId: staffId, reviewedAt: now, updatedAt: now }).where(eq(listingBoosts.id, activeBoost.id));
    await db.insert(auditLog).values({ actorId: staffId, objectType: "listing_boost", objectId: activeBoost.id, action: "cancelled", priorState: "active", newState: "cancelled" });
  }
  await db.update(listings).set({ featured: false, featuredPriority: 0, updatedAt: now }).where(eq(listings.id, listingId));

  return { ok: true, message: "Listing unfeatured." };
}
