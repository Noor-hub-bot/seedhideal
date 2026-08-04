"use server";

import { revalidatePath } from "next/cache";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import {
  auditLog,
  db,
  favorites,
  inquiries,
  listingPhotos,
  listings,
  messages,
  offers,
  reports,
  users,
  verificationCases,
} from "@/db";
import { requireStaff } from "@/lib/auth";
import {
  approveListingAsStaff,
  deleteListingAsStaff,
  featureListingAsStaff,
  markSoldAsStaff,
  pauseListingAsStaff,
  rejectListingAsStaff,
  restoreListingAsStaff,
  resumeListingAsStaff,
  suspendListingAsStaff,
  unfeatureListingAsStaff,
  updateListingContentAsStaff,
  type ListingActionResult,
} from "@/lib/admin/listing-mutations";

export type { ListingActionResult };

export type ListingDetail = {
  id: string;
  status: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  city: string;
  registrationCity: string | null;
  mileageKm: number;
  transmission: string;
  fuel: string;
  engineCc: number | null;
  askingPricePkr: number;
  ownershipCount: number | null;
  bodyType: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  assembly: string | null;
  description: string | null;
  features: string[] | null;
  disclosures: { paintedPanels?: string; accidentHistory?: string; mechanicalIssues?: string; documents?: string } | null;
  rejectionReason: string | null;
  viewCount: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  expiresAt: Date | null;
  soldAt: Date | null;
  photos: string[];
  seller: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    joinedAt: Date;
    verificationStatus: "verified" | "pending" | "none";
  };
  favoritesCount: number;
  messagesCount: number;
  offers: { id: string; amountPkr: number; status: string; createdAt: Date }[];
  reports: { id: string; category: string; status: string; detail: string | null; createdAt: Date; reporterName: string | null }[];
  history: { id: string; action: string; actorName: string | null; priorState: string | null; newState: string | null; reason: string | null; createdAt: Date }[];
};

/**
 * Assembles everything the Listing Details drawer shows in one server action (called
 * on-demand from the client Sheet when a row is opened, not pre-fetched for every row
 * in the table — the "efficient queries" requirement this whole module is under). Every
 * figure is a real query against the same tables the rest of the admin section already
 * reads (reports/audit_log the same way /admin/moderation does, favorites/messages the
 * same way the seller's own /dashboard/analytics does).
 */
export async function getListingDetailAction(listingId: string): Promise<ListingDetail | null> {
  await requireStaff();

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!listing) return null;

  const [seller] = await db.select().from(users).where(eq(users.id, listing.sellerId));

  const [photoRows, verificationRows, favoritesRow, inquiryRows, offerRows, reportRows, historyRows] = await Promise.all([
    db.select({ storageKey: listingPhotos.storageKey }).from(listingPhotos).where(eq(listingPhotos.listingId, listingId)).orderBy(asc(listingPhotos.sortOrder)),
    db.select({ status: verificationCases.status }).from(verificationCases).where(eq(verificationCases.userId, listing.sellerId)),
    db.select({ userId: favorites.userId }).from(favorites).where(eq(favorites.listingId, listingId)),
    db.select({ id: inquiries.id }).from(inquiries).where(eq(inquiries.listingId, listingId)),
    db.select().from(offers).where(eq(offers.listingId, listingId)).orderBy(desc(offers.createdAt)),
    db
      .select({ report: reports, reporterName: users.displayName })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(eq(reports.listingId, listingId))
      .orderBy(desc(reports.createdAt)),
    db
      .select({ log: auditLog, actorName: users.displayName })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorId, users.id))
      .where(eq(auditLog.objectId, listingId))
      .orderBy(desc(auditLog.createdAt)),
  ]);

  const inquiryIds = inquiryRows.map((r) => r.id);
  const [messagesCountRow] = inquiryIds.length
    ? await db.select({ n: count() }).from(messages).where(inArray(messages.inquiryId, inquiryIds))
    : [{ n: 0 }];

  const verificationStatus: "verified" | "pending" | "none" = verificationRows.some((v) => v.status === "verified")
    ? "verified"
    : verificationRows.some((v) => v.status === "pending")
      ? "pending"
      : "none";

  return {
    id: listing.id,
    status: listing.status,
    make: listing.make,
    model: listing.model,
    variant: listing.variant,
    year: listing.year,
    city: listing.city,
    registrationCity: listing.registrationCity,
    mileageKm: listing.mileageKm,
    transmission: listing.transmission,
    fuel: listing.fuel,
    engineCc: listing.engineCc,
    askingPricePkr: listing.askingPricePkr,
    ownershipCount: listing.ownershipCount,
    bodyType: listing.bodyType,
    exteriorColor: listing.exteriorColor,
    interiorColor: listing.interiorColor,
    assembly: listing.assembly,
    description: listing.description,
    features: listing.features,
    disclosures: listing.disclosures,
    rejectionReason: listing.rejectionReason,
    viewCount: listing.viewCount,
    featured: listing.featured,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    approvedAt: listing.approvedAt,
    expiresAt: listing.expiresAt,
    soldAt: listing.soldAt,
    photos: photoRows.map((p) => p.storageKey),
    seller: {
      id: seller.id,
      name: seller.displayName,
      phone: seller.phone,
      email: seller.email,
      city: seller.city,
      joinedAt: seller.createdAt,
      verificationStatus,
    },
    favoritesCount: favoritesRow.length,
    messagesCount: messagesCountRow.n,
    offers: offerRows.map((o) => ({ id: o.id, amountPkr: o.amountPkr, status: o.status, createdAt: o.createdAt })),
    reports: reportRows.map((r) => ({
      id: r.report.id,
      category: r.report.category,
      status: r.report.status,
      detail: r.report.detail,
      createdAt: r.report.createdAt,
      reporterName: r.reporterName,
    })),
    history: historyRows.map((h) => ({
      id: h.log.id,
      action: h.log.action,
      actorName: h.actorName,
      priorState: h.log.priorState,
      newState: h.log.newState,
      reason: h.log.reason,
      createdAt: h.log.createdAt,
    })),
  };
}

/** Wrapped in try/catch — the underlying mutation (e.g. deleteListingAsStaff) has
 * already committed by the time this runs, so a cache-revalidation failure here must
 * never be allowed to surface as a crashed request when the actual admin action
 * genuinely succeeded. Previously unguarded: any revalidatePath() failure here propagated
 * uncaught straight through the "use server" action to Next's generic production error
 * page, even though e.g. the listing was already deleted from the database. */
function revalidateListingPages(listingId?: string) {
  try {
    revalidatePath("/admin");
    revalidatePath("/admin/listings");
    revalidatePath("/admin/moderation");
    revalidatePath("/cars");
    if (listingId) revalidatePath(`/cars/${listingId}`);
  } catch (e) {
    console.error(`[revalidateListingPages] failed (non-fatal — the underlying action already committed): listingId=${listingId ?? "n/a"}`, e);
  }
}

// ---------- Single-listing actions (used by the details drawer / row menu) ----------

export async function approveListingAction(listingId: string): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await approveListingAsStaff(staff.id, listingId);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

export async function rejectListingAction(listingId: string, reason: string): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await rejectListingAsStaff(staff.id, listingId, reason);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

export async function suspendListingAction(listingId: string, reason?: string): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await suspendListingAsStaff(staff.id, listingId, reason);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

export async function restoreListingAction(listingId: string): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await restoreListingAsStaff(staff.id, listingId);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

export async function pauseListingAction(listingId: string): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await pauseListingAsStaff(staff.id, listingId);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

export async function resumeListingAction(listingId: string): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await resumeListingAsStaff(staff.id, listingId);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

export async function markListingSoldAction(listingId: string): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await markSoldAsStaff(staff.id, listingId);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

export async function deleteListingAction(listingId: string): Promise<ListingActionResult> {
  console.log(`[deleteListingAction(admin):${listingId}] staff validation: before`);
  const staff = await requireStaff();
  console.log(`[deleteListingAction(admin):${listingId}] staff validation: after — staffId=${staff.id} role=${staff.role}`);

  const result = await deleteListingAsStaff(staff.id, listingId);
  console.log(`[deleteListingAction(admin):${listingId}] result: ${JSON.stringify(result)}`);
  if (result.ok) {
    console.log(`[deleteListingAction(admin):${listingId}] revalidatePath(): before`);
    revalidateListingPages(listingId);
    console.log(`[deleteListingAction(admin):${listingId}] revalidatePath(): after`);
  }
  return result;
}

/** Staff-only edit of a listing's Car Overview (description) + Features & Highlights —
 * the admin-side counterpart to the seller's own edit form, scoped to just these two
 * fields (see updateListingContentAsStaff's own comment for why it's narrower than a
 * full listing editor). Revalidates the public listing page too, since this is the one
 * admin listing action that changes what a live "active" listing's own page shows. */
export async function updateListingContentAction(
  listingId: string,
  values: { description: string; features: string[] },
): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await updateListingContentAsStaff(staff.id, listingId, values);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

export async function featureListingAction(listingId: string): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await featureListingAsStaff(staff.id, listingId);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

export async function unfeatureListingAction(listingId: string): Promise<ListingActionResult> {
  const staff = await requireStaff();
  const result = await unfeatureListingAsStaff(staff.id, listingId);
  if (result.ok) revalidateListingPages(listingId);
  return result;
}

// ---------- Bulk actions ----------

export type BulkActionResult = { succeeded: number; failed: number; errors: string[] };

async function runBulk(
  staffId: string,
  listingIds: string[],
  fn: (staffId: string, listingId: string) => Promise<ListingActionResult>,
): Promise<BulkActionResult> {
  let succeeded = 0;
  const errors: string[] = [];
  for (const id of listingIds) {
    const result = await fn(staffId, id);
    if (result.ok) succeeded++;
    else errors.push(result.error);
  }
  revalidateListingPages();
  return { succeeded, failed: errors.length, errors };
}

export async function bulkApproveListingsAction(listingIds: string[]): Promise<BulkActionResult> {
  const staff = await requireStaff();
  return runBulk(staff.id, listingIds, approveListingAsStaff);
}

export async function bulkRejectListingsAction(listingIds: string[], reason: string): Promise<BulkActionResult> {
  const staff = await requireStaff();
  return runBulk(staff.id, listingIds, (staffId, id) => rejectListingAsStaff(staffId, id, reason));
}

export async function bulkPauseListingsAction(listingIds: string[]): Promise<BulkActionResult> {
  const staff = await requireStaff();
  return runBulk(staff.id, listingIds, pauseListingAsStaff);
}

export async function bulkResumeListingsAction(listingIds: string[]): Promise<BulkActionResult> {
  const staff = await requireStaff();
  return runBulk(staff.id, listingIds, resumeListingAsStaff);
}

export async function bulkFeatureListingsAction(listingIds: string[]): Promise<BulkActionResult> {
  const staff = await requireStaff();
  return runBulk(staff.id, listingIds, featureListingAsStaff);
}

export async function bulkUnfeatureListingsAction(listingIds: string[]): Promise<BulkActionResult> {
  const staff = await requireStaff();
  return runBulk(staff.id, listingIds, unfeatureListingAsStaff);
}

export async function bulkDeleteListingsAction(listingIds: string[]): Promise<BulkActionResult> {
  const staff = await requireStaff();
  return runBulk(staff.id, listingIds, deleteListingAsStaff);
}
