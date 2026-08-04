"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  auditLog,
  db,
  favorites,
  inquiries,
  listingBoosts,
  listingPhotos,
  listings,
  messages,
  offers,
  recentlyViewed,
  reports,
  reviews,
  visits,
} from "@/db";
import { getSessionUser, isStaff, requireStaff } from "@/lib/auth";
import { notify } from "@/lib/notify";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MIN_PHOTOS,
  deleteListingPhoto,
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

// Every non-terminal status — a listing here can still be withdrawn by its seller, and
// (separately) edited. Terminal states (sold/expired/closed/suspended) are excluded from both.
const MUTABLE_STATES = new Set(["draft", "submitted", "under_review", "correction", "active", "paused"]);

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

  // One free active listing per private seller (LST-01) — staff are exempt, so they can
  // always create test/demo listings without first clearing out an existing one.
  if (!isStaff(user) && (await getBlockingListing(user.id))) {
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

/** Edits a seller's own listing. Reuses listingSchema (same field set as create) and the
 * same photo validation, but photos are optional here (existing ones may already satisfy
 * MIN_PHOTOS) and can be individually removed via `removePhotoIds`. Any successful edit
 * sends the listing back to "submitted" for re-review — content changed, so it needs to be
 * re-checked the same way a fresh submission does, regardless of what status it was in. */
export async function editListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getSessionUser();
  const listingId = String(formData.get("listingId"));
  if (!user) redirect(`/sign-in?next=/dashboard/listings/${listingId}/edit`);
  if (user.status !== "active") return { error: "Your account cannot edit listings right now. Contact support." };

  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing) return { error: "Listing not found." };
  if (!MUTABLE_STATES.has(listing.status)) return { error: "This listing can no longer be edited." };

  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: `${first.path.join(".")}: ${first.message}` };
  }
  const v = parsed.data;

  const removeIds = new Set(formData.getAll("removePhotoIds").map(String));
  const existingPhotos = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId))
    .orderBy(listingPhotos.sortOrder);
  const keptPhotos = existingPhotos.filter((p) => !removeIds.has(p.id));
  const removedPhotos = existingPhotos.filter((p) => removeIds.has(p.id));

  const newPhotos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  const finalPhotoCount = keptPhotos.length + newPhotos.length;
  if (finalPhotoCount < MIN_PHOTOS) {
    return { error: `Keep at least ${MIN_PHOTOS} photos (front, side, and interior).` };
  }
  if (finalPhotoCount > MAX_PHOTOS) {
    return { error: `Keep at most ${MAX_PHOTOS} photos.` };
  }
  for (const photo of newPhotos) {
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

  await db
    .update(listings)
    .set({
      status: "submitted",
      rejectionReason: null,
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
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId));

  for (const photo of removedPhotos) {
    await db.delete(listingPhotos).where(eq(listingPhotos.id, photo.id));
    await deleteListingPhoto(photo.storageKey).catch(() => {});
  }

  for (const [index, photo] of newPhotos.entries()) {
    const storageKey = await uploadListingPhoto(photo, listingId);
    await db.insert(listingPhotos).values({
      listingId,
      kind: PHOTO_KIND_ORDER[keptPhotos.length + index] ?? "other",
      storageKey,
      sortOrder: keptPhotos.length + index,
    });
  }

  await db.insert(auditLog).values({
    actorId: user.id,
    objectType: "listing",
    objectId: listingId,
    action: "edited",
    priorState: listing.status,
    newState: "submitted",
  });

  revalidatePath("/dashboard/listings");
  revalidatePath(`/cars/${listingId}`);
  redirect("/dashboard/listings?edited=1");
}

// ---------- Live photo management (edit page — reorder/cover/delete) ----------
// Unlike editListingAction above, these apply instantly (no "save changes" step) since
// they only ever touch listingPhotos, never the listing's own review status. "Cover photo"
// is not a separate column — position 0 (lowest sortOrder) already means "the photo every
// display surface picks first" (see enrichListings in lib/listing-enrichment.ts, and the
// direct queries in cars/[id] and the homepage hero, all `ORDER BY sortOrder ASC`), so
// "set as cover" and "reorder" are the same underlying write: persist a new sortOrder
// sequence. No schema migration needed.

async function persistPhotoOrder(orderedIds: string[]): Promise<void> {
  await db.batch(
    orderedIds.map((id, index) =>
      db.update(listingPhotos).set({ sortOrder: index }).where(eq(listingPhotos.id, id)),
    ) as unknown as Parameters<typeof db.batch>[0],
  );
}

export type PhotoActionState = { error?: string };

/** Persists a full drag-and-drop reorder. `orderedIds` must be exactly the current
 * listing's photo ids in their new order — verified against the DB, not trusted blindly,
 * so a tampered request can't touch another listing's photos or invent/drop rows. */
export async function reorderListingPhotosAction(
  listingId: string,
  orderedIds: string[],
): Promise<PhotoActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing) return { error: "Listing not found." };

  const current = await db
    .select({ id: listingPhotos.id })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId));
  const currentIds = new Set(current.map((p) => p.id));
  if (orderedIds.length !== currentIds.size || orderedIds.some((id) => !currentIds.has(id))) {
    return { error: "Photo order didn't match — please refresh and try again." };
  }

  await persistPhotoOrder(orderedIds);
  revalidatePath(`/cars/${listingId}`);
  revalidatePath("/dashboard/listings");
  return {};
}

/** Moves one photo to the front (sortOrder 0) — "cover" is just "first", so this is a
 * reorder where the chosen photo jumps to the head and everything else keeps its
 * relative order behind it. */
export async function setCoverPhotoAction(
  listingId: string,
  photoId: string,
): Promise<PhotoActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing) return { error: "Listing not found." };

  const current = await db
    .select({ id: listingPhotos.id })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId))
    .orderBy(asc(listingPhotos.sortOrder));
  if (!current.some((p) => p.id === photoId)) return { error: "Photo not found." };

  const reordered = [photoId, ...current.map((p) => p.id).filter((id) => id !== photoId)];
  await persistPhotoOrder(reordered);
  revalidatePath(`/cars/${listingId}`);
  revalidatePath("/dashboard/listings");
  return {};
}

/** Deletes exactly one photo — from Neon Object Storage first (strict: any failure aborts
 * before the database is touched, same rule as deleteListingAction), then its DB row, then
 * renumbers what's left so sortOrder stays contiguous 0..n-1. Refuses to go below
 * MIN_PHOTOS. Because the remaining photos are renumbered from the front, if the deleted
 * photo was the cover (sortOrder 0), whatever photo is now first automatically becomes the
 * new cover — no separate "reassign cover" step needed. */
export async function deleteListingPhotoAction(
  listingId: string,
  photoId: string,
): Promise<PhotoActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing) return { error: "Listing not found." };

  const current = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId))
    .orderBy(asc(listingPhotos.sortOrder));
  if (current.length <= MIN_PHOTOS) {
    return { error: `A listing needs at least ${MIN_PHOTOS} photos — add one before removing another.` };
  }
  const target = current.find((p) => p.id === photoId);
  if (!target) return { error: "Photo not found." };

  try {
    await deleteListingPhoto(target.storageKey);
  } catch {
    return { error: "Could not delete this photo from storage. Please try again." };
  }

  const remainingIds = current.filter((p) => p.id !== photoId).map((p) => p.id);
  await db.batch([
    db.delete(listingPhotos).where(eq(listingPhotos.id, photoId)),
    ...remainingIds.map((id, index) =>
      db.update(listingPhotos).set({ sortOrder: index }).where(eq(listingPhotos.id, id)),
    ),
  ] as unknown as Parameters<typeof db.batch>[0]);

  revalidatePath(`/cars/${listingId}`);
  revalidatePath("/dashboard/listings");
  return {};
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
  revalidatePath("/admin/moderation");
  revalidatePath("/");
}

// ---------- Listing lifecycle (seller-initiated) ----------

export async function loadOwnedListing(listingId: string, sellerId: string) {
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!listing || listing.sellerId !== sellerId) return null;
  return listing;
}

/** Exported so admin-listings.ts can reuse this same update+audit-log+revalidate core
 * for staff-initiated transitions (suspend/restore/pause/resume/mark sold), rather than
 * a second copy of it — the only difference is who's allowed to call it and which prior
 * status is considered legal, both of which stay the caller's responsibility. */
export async function transitionListing(
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

export async function withdrawListingAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const listingId = String(formData.get("listingId"));
  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing || !MUTABLE_STATES.has(listing.status)) return;

  await transitionListing(listingId, user.id, listing.status, { status: "closed" }, "withdrawn");
}

export type DeleteListingState = { error?: string };

/** Permanently deletes a listing and everything that references it. Unlike every other
 * lifecycle action here, this is irreversible — there is no status to transition back
 * from. Available regardless of the listing's current status (including terminal ones
 * like sold/expired/closed, where it's the only remaining action).
 *
 * neon-http (this project's Postgres driver) has no interactive transaction support —
 * `db.transaction()` throws "No transactions support in neon-http driver" unconditionally
 * (confirmed directly in node_modules/drizzle-orm/neon-http/session.js). `db.batch([...])`
 * is the driver's actual atomicity primitive: Neon's serverless client sends the whole
 * batch as one HTTP request, executed as a single all-or-nothing transaction server-side.
 * That's what satisfies "no partial deletes" here.
 *
 * Storage deletion happens BEFORE the batch and is checked strictly: if any photo fails to
 * delete from Neon Object Storage, we bail out before the batch ever runs, so the database
 * is never touched — no listing row can end up deleted while its photos still exist in the
 * DB pointing at (now storage-inconsistent) keys, and no photo can be deleted from storage
 * while its listingPhotos row (and the listing itself) survives. */
export type DeleteRecordsOutcome = { ok: true } | { ok: false; error: string };

/** Unwraps a Drizzle/Neon error chain (DrizzleQueryError -> NeonDbError -> the real
 * driver-level cause) into every field useful for pinpointing "the exact SQL statement
 * causing the failure" — the failing query text and params (present on both
 * DrizzleQueryError and, for a batch, on the specific statement Neon's HTTP transaction
 * API reports back), plus whatever real Postgres error metadata came back (constraint/
 * table/column/detail/code). Logged in full rather than left for Next.js's production
 * error page to reduce to "Something went wrong". */
function describeDbError(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  const parts: string[] = [`${e.name}: ${e.message}`];
  const anyErr = e as Error & {
    query?: string;
    params?: unknown;
    cause?: unknown;
  };
  if (anyErr.query) parts.push(`query="${anyErr.query}"`);
  if (anyErr.params !== undefined) parts.push(`params=${JSON.stringify(anyErr.params)}`);

  let cause: unknown = anyErr.cause;
  let depth = 0;
  while (cause instanceof Error && depth < 5) {
    const c = cause as Error & {
      severity?: string;
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
      column?: string;
      sourceError?: unknown;
      cause?: unknown;
    };
    parts.push(
      `cause[${depth}]=${c.name}: ${c.message}` +
        (c.code ? ` code=${c.code}` : "") +
        (c.detail ? ` detail="${c.detail}"` : "") +
        (c.constraint ? ` constraint=${c.constraint}` : "") +
        (c.table ? ` table=${c.table}` : "") +
        (c.column ? ` column=${c.column}` : ""),
    );
    cause = c.sourceError ?? c.cause;
    depth += 1;
  }
  parts.push(`stack=${e.stack ?? "(none)"}`);
  return parts.join(" | ");
}

/** The actual multi-table batch delete, extracted so both the seller-facing action
 * below and the staff-facing one in admin-listings.ts share exactly one copy of it —
 * ownership/permission checks and the redirect-vs-return-result behavior stay with each
 * caller, since those differ (a seller redirects on success; an admin bulk action needs
 * a plain result to aggregate across many listings).
 *
 * Every step is logged and every DB call that can throw is caught here — previously only
 * the storage-deletion loop was, so any transient failure in the initial reads, the
 * batch, or revalidatePath propagated uncaught straight to Next.js's generic production
 * error page ("Something went wrong") instead of a clean, logged, user-facing error. */
export async function deleteListingRecords(listingId: string, priorStatus: string, actorId: string): Promise<DeleteRecordsOutcome> {
  const log = (msg: string) => console.log(`[deleteListingRecords:${listingId}] ${msg}`);

  log(`start priorStatus=${priorStatus} actorId=${actorId}`);

  let photos: (typeof listingPhotos.$inferSelect)[];
  let inquiryIds: string[];
  try {
    log("loading photos: before");
    photos = await db.select().from(listingPhotos).where(eq(listingPhotos.listingId, listingId));
    log(`loading photos: after — count=${photos.length} keys=${JSON.stringify(photos.map((p) => p.storageKey))}`);

    log("loading related inquiries: before");
    const relatedInquiries = await db.select({ id: inquiries.id }).from(inquiries).where(eq(inquiries.listingId, listingId));
    inquiryIds = relatedInquiries.map((i) => i.id);
    log(`loading related inquiries: after — count=${inquiryIds.length}`);
  } catch (e) {
    console.error(`[deleteListingRecords:${listingId}] FAILED loading listing data: ${describeDbError(e)}`);
    return { ok: false, error: "Could not load this listing's data. Please try again." };
  }

  log("deleting storage objects: before");
  try {
    for (const photo of photos) {
      await deleteListingPhoto(photo.storageKey);
    }
    log("deleting storage objects: after — all succeeded (or were skipped as not owned by the active backend)");
  } catch (e) {
    console.error(`[deleteListingRecords:${listingId}] FAILED deleting storage objects: ${describeDbError(e)}`);
    return { ok: false, error: "Could not delete this listing's photos from storage. Please try again." };
  }

  // Labeled 1:1 with the batch array below, purely for logging — db.batch() takes the
  // query builders themselves, this is never sent to the database.
  const statementLabels = [
    ...(inquiryIds.length > 0 ? ["delete messages (by inquiryIds)"] : []),
    "delete offers",
    "delete visits",
    "delete inquiries",
    "delete favorites",
    "delete recentlyViewed",
    "delete listingBoosts",
    "delete listingPhotos",
    "update reviews (detach listingId)",
    "delete reports",
    "delete listings (the row itself)",
    "insert auditLog",
  ];

  log(`db.batch(): before — ${statementLabels.length} statements: ${JSON.stringify(statementLabels)}`);
  try {
    await db.batch([
      // Children of inquiries — must go before inquiries themselves.
      ...(inquiryIds.length > 0
        ? [db.delete(messages).where(inArray(messages.inquiryId, inquiryIds))]
        : []),
      db.delete(offers).where(eq(offers.listingId, listingId)),
      db.delete(visits).where(eq(visits.listingId, listingId)),
      db.delete(inquiries).where(eq(inquiries.listingId, listingId)),
      // Direct children of the listing.
      db.delete(favorites).where(eq(favorites.listingId, listingId)),
      db.delete(recentlyViewed).where(eq(recentlyViewed.listingId, listingId)),
      db.delete(listingBoosts).where(eq(listingBoosts.listingId, listingId)),
      db.delete(listingPhotos).where(eq(listingPhotos.listingId, listingId)),
      // Reviews are about the transaction, not owned by the listing — detach rather than
      // delete, so a seller can't erase a buyer's review by deleting the listing it's on.
      db.update(reviews).set({ listingId: null }).where(eq(reviews.listingId, listingId)),
      db.delete(reports).where(eq(reports.listingId, listingId)),
      // The listing row itself — must be last, after every FK referencing it is gone.
      db.delete(listings).where(eq(listings.id, listingId)),
      db.insert(auditLog).values({
        actorId,
        objectType: "listing",
        objectId: listingId,
        action: "deleted",
        priorState: priorStatus,
        newState: "deleted",
      }),
    ] as unknown as Parameters<typeof db.batch>[0]);
    log("db.batch(): after — committed");
  } catch (e) {
    console.error(
      `[deleteListingRecords:${listingId}] FAILED db.batch() — attempted statements: ${JSON.stringify(statementLabels)} | ${describeDbError(e)}`,
    );
    return { ok: false, error: "Could not delete this listing. Please try again, or contact support if this keeps happening." };
  }

  log("audit log creation: included in db.batch() above (insert auditLog), committed atomically with the delete");

  // The batch already committed — the listing is genuinely gone at this point. A cache
  // revalidation failure must never be reported back as "the delete failed" (it isn't),
  // so this is caught and logged, not propagated.
  log("revalidatePath(): before");
  try {
    revalidatePath("/dashboard/listings");
    revalidatePath("/cars");
    log("revalidatePath(): after — succeeded");
  } catch (e) {
    console.error(`[deleteListingRecords:${listingId}] revalidatePath() failed (non-fatal — delete already committed): ${describeDbError(e)}`);
  }

  log("done — ok:true");
  return { ok: true };
}

export async function deleteListingAction(
  _prev: DeleteListingState,
  formData: FormData,
): Promise<DeleteListingState> {
  const user = await getSessionUser();
  const listingId = String(formData.get("listingId"));
  if (!user) redirect("/sign-in");

  console.log(`[deleteListingAction:${listingId}] ownership validation: before — userId=${user.id}`);
  const listing = await loadOwnedListing(listingId, user.id);
  console.log(`[deleteListingAction:${listingId}] ownership validation: after — owned=${!!listing}`);
  if (!listing) return { error: "Listing not found." };

  const result = await deleteListingRecords(listingId, listing.status, user.id);
  if (!result.ok) return { error: result.error };

  console.log(`[deleteListingAction:${listingId}] redirect(): before`);
  redirect("/dashboard/listings?deleted=1");
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
