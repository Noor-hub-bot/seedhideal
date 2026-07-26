"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  auditLog,
  db,
  favorites,
  inquiries,
  listingPhotos,
  listings,
  messages,
} from "@/db";
import { getSessionUser, requireStaff } from "@/lib/auth";
import { notify } from "@/lib/notify";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MIN_PHOTOS,
  detectFileType,
  uploadListingPhoto,
} from "@/lib/storage";

const PHOTO_KIND_ORDER = [
  "front",
  "rear",
  "left",
  "right",
  "interior",
  "odometer",
  "engine_bay",
] as const;

const listingSchema = z.object({
  make: z.string().min(2).max(48),
  model: z.string().min(1).max(48),
  variant: z.string().max(64).optional().or(z.literal("")),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  city: z.string().min(2).max(64),
  registrationCity: z.string().max(64).optional().or(z.literal("")),
  mileageKm: z.coerce.number().int().min(0).max(2_000_000),
  transmission: z.enum(["manual", "automatic"]),
  fuel: z.enum(["petrol", "diesel", "hybrid", "electric", "cng"]),
  // Preprocess so a blank input becomes `undefined` (not 0) before coercion —
  // `z.coerce.number()` would otherwise turn "" into 0 and store a fake engine size.
  engineCc: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int().min(0).max(10_000).optional(),
  ),
  askingPricePkr: z.coerce.number().int().min(50_000).max(1_000_000_000),
  ownershipCount: z.coerce.number().int().min(1).max(20).optional(),
  sellerType: z.enum(["individual", "dealer"]).default("individual"),
  bodyType: z.string().max(32).optional().or(z.literal("")),
  exteriorColor: z.string().max(32).optional().or(z.literal("")),
  interiorColor: z.string().max(32).optional().or(z.literal("")),
  assembly: z.enum(["local", "imported"]).optional().or(z.literal("")),
  description: z.string().max(4000).optional().or(z.literal("")),
  paintedPanels: z.string().max(200),
  accidentHistory: z.string().max(200),
  mechanicalIssues: z.string().max(500),
  documents: z.string().max(200),
});

const BLOCKING_STATES = new Set(["submitted", "under_review", "correction", "paused"]);

/**
 * Returns the seller's listing that currently blocks a new submission (LST-01: one free
 * active listing per private seller), or null if they're free to list. An "active" listing
 * whose expiresAt has already passed doesn't block — it's treated as expired even if the
 * cron sweep (/api/cron/sweep-listings) hasn't run yet.
 */
export async function getBlockingListing(userId: string) {
  const existing = await db.select().from(listings).where(eq(listings.sellerId, userId));
  return (
    existing.find(
      (l) =>
        BLOCKING_STATES.has(l.status) ||
        (l.status === "active" && (!l.expiresAt || l.expiresAt > new Date())),
    ) ?? null
  );
}

export type ListingFormState = { error?: string };

export async function submitListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/sell");
  if (user.status !== "active") return { error: "Your account cannot list right now. Contact support." };

  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: `${first.path.join(".")}: ${first.message}` };
  }
  const v = parsed.data;

  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length < MIN_PHOTOS) {
    return { error: `Add at least ${MIN_PHOTOS} photos (front, side, and interior).` };
  }
  if (photos.length > MAX_PHOTOS) {
    return { error: `Add at most ${MAX_PHOTOS} photos.` };
  }
  for (const photo of photos) {
    if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
      return { error: "Photos must be JPG, PNG or WEBP." };
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return { error: "Each photo must be under 6MB." };
    }
    const actualType = detectFileType(new Uint8Array(await photo.arrayBuffer()));
    if (actualType !== photo.type) {
      return { error: "One of your photos doesn't look like a valid JPG, PNG or WEBP file." };
    }
  }

  // One free active listing per private seller (LST-01)
  if (await getBlockingListing(user.id)) {
    return { error: "You already have an active listing. Close or mark it sold before listing another car." };
  }

  const [listing] = await db
    .insert(listings)
    .values({
      sellerId: user.id,
      status: "submitted",
      make: v.make,
      model: v.model,
      variant: v.variant || null,
      year: v.year,
      city: v.city,
      registrationCity: v.registrationCity || null,
      mileageKm: v.mileageKm,
      transmission: v.transmission,
      fuel: v.fuel,
      engineCc: v.engineCc ?? null,
      askingPricePkr: v.askingPricePkr,
      ownershipCount: v.ownershipCount ?? null,
      sellerType: v.sellerType,
      bodyType: v.bodyType || null,
      exteriorColor: v.exteriorColor || null,
      interiorColor: v.interiorColor || null,
      assembly: v.assembly || null,
      description: v.description || null,
      disclosures: {
        paintedPanels: v.paintedPanels,
        accidentHistory: v.accidentHistory,
        mechanicalIssues: v.mechanicalIssues,
        documents: v.documents,
      },
    })
    .returning();

  for (const [index, photo] of photos.entries()) {
    const storageKey = await uploadListingPhoto(photo, listing.id);
    await db.insert(listingPhotos).values({
      listingId: listing.id,
      kind: PHOTO_KIND_ORDER[index] ?? "other",
      storageKey,
      sortOrder: index,
    });
  }

  await db.insert(auditLog).values({
    actorId: user.id,
    objectType: "listing",
    objectId: listing.id,
    action: "submitted",
    newState: "submitted",
  });

  redirect("/dashboard?submitted=1");
}

// ---------- Moderation (MOD-01/02/04) ----------

export async function moderateListingAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const listingId = String(formData.get("listingId"));
  const decision = String(formData.get("decision")); // approve | reject
  const reason = String(formData.get("reason") ?? "").trim();

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!listing || !["submitted", "under_review", "correction"].includes(listing.status)) return;

  if (decision === "approve") {
    await db
      .update(listings)
      .set({
        status: "active",
        approvedAt: new Date(),
        // Standard active period — final duration is an open PRD decision (§16.1)
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId));
  } else {
    if (!reason) return; // rejection always needs a plain-language reason (MOD-04)
    await db
      .update(listings)
      .set({ status: "correction", rejectionReason: reason, updatedAt: new Date() })
      .where(eq(listings.id, listingId));
  }

  await db.insert(auditLog).values({
    actorId: staff.id,
    objectType: "listing",
    objectId: listingId,
    action: decision === "approve" ? "approved" : "correction_requested",
    priorState: listing.status,
    newState: decision === "approve" ? "active" : "correction",
    reason: reason || null,
  });

  await notify({
    userId: listing.sellerId,
    type: decision === "approve" ? "listing_approved" : "listing_correction",
    title:
      decision === "approve"
        ? "Your listing is live"
        : "Your listing needs a correction",
    body: reason || undefined,
    href: "/dashboard",
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

// ---------- Listing lifecycle (seller-initiated) ----------

async function loadOwnedListing(listingId: string, sellerId: string) {
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!listing || listing.sellerId !== sellerId) return null;
  return listing;
}

async function transitionListing(
  listingId: string,
  actorId: string,
  priorState: string,
  values: Partial<typeof listings.$inferInsert>,
  action: string,
) {
  await db
    .update(listings)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(listings.id, listingId));
  await db.insert(auditLog).values({
    actorId,
    objectType: "listing",
    objectId: listingId,
    action,
    priorState,
    newState: values.status ?? priorState,
  });
  revalidatePath("/dashboard");
  revalidatePath("/cars");
  revalidatePath(`/cars/${listingId}`);
}

export async function markListingSoldAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const listingId = String(formData.get("listingId"));
  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing || !["active", "paused"].includes(listing.status)) return;

  const rawPrice = String(formData.get("reportedSoldPricePkr") ?? "").trim();
  const reportedSoldPricePkr =
    rawPrice && /^\d+$/.test(rawPrice) ? Number(rawPrice) : null;

  await transitionListing(
    listingId,
    user.id,
    listing.status,
    { status: "sold", soldAt: new Date(), reportedSoldPricePkr },
    "marked_sold",
  );

  // Favorite Alerts: tell everyone who saved this listing that it's gone.
  const savers = await db
    .select({ userId: favorites.userId })
    .from(favorites)
    .where(eq(favorites.listingId, listingId));
  for (const s of savers) {
    await notify({
      userId: s.userId,
      type: "favorite_sold",
      title: `${listing.make} ${listing.model} you saved has been sold`,
      href: `/cars/${listingId}`,
    });
  }
}

export async function pauseListingAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const listingId = String(formData.get("listingId"));
  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing || listing.status !== "active") return;

  await transitionListing(listingId, user.id, listing.status, { status: "paused" }, "paused");
}

export async function resumeListingAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const listingId = String(formData.get("listingId"));
  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing || listing.status !== "paused") return;

  await transitionListing(listingId, user.id, listing.status, { status: "active" }, "resumed");
}

const WITHDRAWABLE_STATES = new Set([
  "draft",
  "submitted",
  "under_review",
  "correction",
  "active",
  "paused",
]);

export async function withdrawListingAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const listingId = String(formData.get("listingId"));
  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing || !WITHDRAWABLE_STATES.has(listing.status)) return;

  await transitionListing(listingId, user.id, listing.status, { status: "closed" }, "withdrawn");
}

// ---------- Protected inquiry (INQ-01..03) ----------

export type InquiryFormState = { error?: string; sent?: boolean };

export async function sendInquiryAction(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const user = await getSessionUser();
  const listingId = String(formData.get("listingId"));
  if (!user) redirect(`/sign-in?next=/cars/${listingId}`);

  const intent = String(formData.get("intent"));
  const body = String(formData.get("body") ?? "").trim();
  if (!["question", "offer", "visit"].includes(intent)) return { error: "Choose what you want to do." };
  if (body.length < 5) return { error: "Write a short message to the seller." };
  if (body.length > 2000) return { error: "Message is too long." };

  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.status, "active")));
  if (!listing) return { error: "This listing is no longer active." };
  if (listing.sellerId === user.id) return { error: "You cannot inquire on your own listing." };

  const [inquiry] = await db
    .insert(inquiries)
    .values({
      listingId,
      buyerId: user.id,
      intent: intent as "question" | "offer" | "visit",
    })
    .returning();

  await db.insert(messages).values({
    inquiryId: inquiry.id,
    senderId: user.id,
    body,
  });

  await notify({
    userId: listing.sellerId,
    type: "inquiry_received",
    title: `New ${intent} on your ${listing.make} ${listing.model}`,
    href: `/dashboard/inquiries/${inquiry.id}`,
  });

  return { sent: true };
}

export type ReplyFormState = { error?: string };

export async function replyToInquiryAction(
  _prev: ReplyFormState,
  formData: FormData,
): Promise<ReplyFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const inquiryId = String(formData.get("inquiryId"));
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 5) return { error: "Write a short message." };
  if (body.length > 2000) return { error: "Message is too long." };

  const [row] = await db
    .select({ inquiry: inquiries, listing: listings })
    .from(inquiries)
    .innerJoin(listings, eq(inquiries.listingId, listings.id))
    .where(eq(inquiries.id, inquiryId));
  if (!row) return { error: "Conversation not found." };
  const { inquiry, listing } = row;

  const isBuyer = inquiry.buyerId === user.id;
  const isSeller = listing.sellerId === user.id;
  if (!isBuyer && !isSeller) return { error: "You don't have access to this conversation." };
  if (["declined", "closed"].includes(inquiry.status)) {
    return { error: "This conversation is closed." };
  }

  await db.insert(messages).values({ inquiryId, senderId: user.id, body });

  if (isSeller && inquiry.status === "sent") {
    await db.update(inquiries).set({ status: "responded" }).where(eq(inquiries.id, inquiryId));
  }

  await notify({
    userId: isSeller ? inquiry.buyerId : listing.sellerId,
    type: "message_received",
    title: `New reply on ${listing.make} ${listing.model}`,
    href: `/dashboard/inquiries/${inquiryId}`,
  });

  revalidatePath(`/dashboard/inquiries/${inquiryId}`);
  revalidatePath("/dashboard");
  return {};
}
