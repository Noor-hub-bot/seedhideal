import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Write a review" };

export default async function NewReviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/reviews/new");

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-[32px] font-medium leading-tight">Write a review</h1>
      <p className="mt-2 text-sm text-muted">
        Tell other buyers and sellers about your experience with SeedhiDeal.
        Reviews are checked before they appear publicly.
      </p>
      <div className="mt-6">
        <ReviewForm />
      </div>
    </div>
  );
}
