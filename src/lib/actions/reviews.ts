"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auditLog, db, reviews } from "@/db";
import { getSessionUser, requireStaff } from "@/lib/auth";
import { notify } from "@/lib/notify";

export type ReviewFormState = { error?: string; sent?: boolean };

export async function submitReviewAction(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in to write a review." };

  const rating = Number(formData.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Choose a rating from 1 to 5 stars." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3 || title.length > 120) {
    return { error: "Title should be 3-120 characters." };
  }

  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 10 || body.length > 2000) {
    return { error: "Please write at least 10 characters about your experience." };
  }

  const isAnonymous = formData.get("isAnonymous") === "on";
  const displayName = isAnonymous
    ? "Anonymous"
    : (user.displayName?.trim() || "SeedhiDeal user");

  await db.insert(reviews).values({
    authorId: user.id,
    isAnonymous,
    displayName,
    rating,
    title,
    body,
    status: "pending",
  });

  return { sent: true };
}

async function decideReview(
  formData: FormData,
  status: "approved" | "rejected",
): Promise<void> {
  const staff = await requireStaff();
  const reviewId = String(formData.get("reviewId"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (status === "rejected" && !reason) return;

  const [existing] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
  if (!existing || existing.status !== "pending") return;

  await db
    .update(reviews)
    .set({
      status,
      reviewerId: staff.id,
      reviewerNote: reason || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId));

  await db.insert(auditLog).values({
    actorId: staff.id,
    objectType: "review",
    objectId: reviewId,
    action: status === "approved" ? "approved" : "rejected",
    priorState: existing.status,
    newState: status,
    reason: reason || null,
  });

  await notify({
    userId: existing.authorId,
    type: status === "approved" ? "review_approved" : "review_rejected",
    title: status === "approved" ? "Your review is now live" : "Your review wasn't approved",
    body: reason || undefined,
    href: "/dashboard/reviews",
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function approveReviewAction(formData: FormData): Promise<void> {
  await decideReview(formData, "approved");
}

export async function rejectReviewAction(formData: FormData): Promise<void> {
  await decideReview(formData, "rejected");
}
