import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, reviews } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "My reviews" };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  approved: "Live",
  rejected: "Not approved",
};
const STATUS_TONE: Record<string, "review" | "verified" | "neutral"> = {
  pending: "review",
  approved: "verified",
  rejected: "neutral",
};

export default async function MyReviewsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/reviews");

  const myReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.authorId, user.id))
    .orderBy(desc(reviews.createdAt));

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium leading-tight">My reviews</h1>
        <ButtonLink href="/reviews/new">Write a review</ButtonLink>
      </div>

      {myReviews.length === 0 ? (
        <Card className="p-6 text-sm text-muted">You haven&apos;t written any reviews yet.</Card>
      ) : (
        <div className="space-y-3">
          {myReviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gold">
                  {"★".repeat(r.rating)}
                  <span className="text-neutral-chip">{"★".repeat(5 - r.rating)}</span>
                </span>
                <h3 className="font-semibold">{r.title}</h3>
                <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </div>
              <p className="mt-2 text-sm text-body-soft">{r.body}</p>
              {r.status === "rejected" && r.reviewerNote && (
                <p className="mt-2 rounded-input bg-alert-soft px-2 py-1 text-xs text-alert-ink">
                  {r.reviewerNote}
                </p>
              )}
              <p className="mt-2 text-xs text-muted">{formatDate(r.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
