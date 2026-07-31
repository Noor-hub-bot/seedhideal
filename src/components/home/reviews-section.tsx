import Link from "next/link";
import { unstable_cache } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db, reviews } from "@/db";
import { Card } from "@/components/ui";
import { SectionHeading } from "./section-heading";
import { StarIcon } from "./icons";
import { safeSection } from "@/lib/safe-section";

// Not personalized — safe to cache for 60s, same rationale as BrandGrid.
const getApprovedReviews = unstable_cache(
  async () =>
    db
      .select()
      .from(reviews)
      .where(eq(reviews.status, "approved"))
      .orderBy(desc(reviews.createdAt))
      .limit(6),
  ["home-reviews"],
  { revalidate: 60 },
);

// Only approved reviews are ever queried — pending/rejected reviews never
// reach this component. Renders nothing when there are no approved reviews
// yet, rather than a placeholder or hardcoded testimonial.
export async function ReviewsSection() {
  const approved = await safeSection(getApprovedReviews, []);

  if (approved.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading title="What our customers say" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {approved.map((r) => (
          <Card key={r.id} className="p-6">
            <div className="mb-2 flex items-center gap-0.5 text-gold" aria-label={`${r.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} className={`h-4 w-4 shrink-0 ${i < r.rating ? "" : "text-neutral-chip"}`} />
              ))}
            </div>
            <h3 className="mb-1.5 font-semibold">{r.title}</h3>
            <p className="mb-4 text-sm leading-relaxed text-body-soft">{r.body}</p>
            <p className="text-[13px] font-semibold text-muted">{r.displayName}</p>
          </Card>
        ))}
      </div>
      <Link
        href="/reviews/new"
        className="mt-6 inline-block text-[13px] font-semibold text-brand hover:text-brand-strong"
      >
        Write a review →
      </Link>
    </section>
  );
}
