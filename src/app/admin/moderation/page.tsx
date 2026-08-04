import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { alias } from "drizzle-orm/pg-core";
import { asc, eq, inArray } from "drizzle-orm";
import {
  db,
  featuredPlans,
  listingBoosts,
  listings,
  reports,
  reviews,
  supportTickets,
  users,
  verificationCases,
} from "@/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { moderateListingAction } from "@/lib/actions/marketplace";
import { approveVerificationAction, rejectVerificationAction } from "@/lib/actions/verification";
import { updateReportStatusAction } from "@/lib/actions/reports";
import { updateTicketStatusAction } from "@/lib/actions/support";
import { approveReviewAction, rejectReviewAction } from "@/lib/actions/reviews";
import { approveBoostAction, cancelActiveBoostAction, rejectBoostAction } from "@/lib/actions/boosts";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { formatDate, formatKm, formatPkr } from "@/lib/format";

const REPORT_CATEGORY_LABELS: Record<string, string> = {
  fake_listing: "Fake or misleading listing",
  ownership_concern: "Ownership concern",
  dealer_mislabeling: "Dealer posing as private owner",
  scam_request: "Scam or suspicious request",
  harassment: "Harassment or abuse",
  incorrect_condition: "Incorrect condition disclosure",
};

const TICKET_STATUS_LABEL: Record<string, string> = {
  new: "New",
  assigned: "Assigned",
  waiting_user: "Waiting on user",
  waiting_internal: "With our team",
  escalated: "Escalated",
  reopened: "Reopened",
};

const TICKET_SEVERITY_TONE: Record<string, "review" | "neutral"> = {
  payment: "review",
  safety: "review",
  standard: "neutral",
  low: "neutral",
};

export const metadata: Metadata = { title: "Admin — moderation queue" };

export default async function ModerationPage() {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  const queue = await db
    .select({ listing: listings, seller: users })
    .from(listings)
    .innerJoin(users, eq(listings.sellerId, users.id))
    .where(inArray(listings.status, ["submitted", "under_review", "correction"]))
    .orderBy(asc(listings.createdAt));

  const pendingVerifications = await db
    .select({ verificationCase: verificationCases, applicant: users })
    .from(verificationCases)
    .innerJoin(users, eq(verificationCases.userId, users.id))
    .where(eq(verificationCases.status, "pending"))
    .orderBy(asc(verificationCases.createdAt));

  const reportedUsers = alias(users, "reported_users");
  const openReports = await db
    .select({
      report: reports,
      reporter: users,
      listing: listings,
      reportedUser: reportedUsers,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .leftJoin(listings, eq(reports.listingId, listings.id))
    .leftJoin(reportedUsers, eq(reports.reportedUserId, reportedUsers.id))
    .where(inArray(reports.status, ["new", "triaged", "investigating"]))
    .orderBy(asc(reports.createdAt));

  const pendingBoosts = await db
    .select({ boost: listingBoosts, listing: listings, plan: featuredPlans, seller: users })
    .from(listingBoosts)
    .innerJoin(listings, eq(listingBoosts.listingId, listings.id))
    .innerJoin(featuredPlans, eq(listingBoosts.planId, featuredPlans.id))
    .innerJoin(users, eq(listings.sellerId, users.id))
    .where(eq(listingBoosts.status, "pending"))
    .orderBy(asc(listingBoosts.createdAt));

  const activeBoosts = await db
    .select({ boost: listingBoosts, listing: listings, plan: featuredPlans })
    .from(listingBoosts)
    .innerJoin(listings, eq(listingBoosts.listingId, listings.id))
    .innerJoin(featuredPlans, eq(listingBoosts.planId, featuredPlans.id))
    .where(eq(listingBoosts.status, "active"))
    .orderBy(asc(listingBoosts.expiresAt));

  const pendingReviews = await db
    .select({ review: reviews, author: users })
    .from(reviews)
    .innerJoin(users, eq(reviews.authorId, users.id))
    .where(eq(reviews.status, "pending"))
    .orderBy(asc(reviews.createdAt));

  const openTickets = await db
    .select({ ticket: supportTickets, requester: users })
    .from(supportTickets)
    .innerJoin(users, eq(supportTickets.userId, users.id))
    .where(
      inArray(supportTickets.status, [
        "new",
        "assigned",
        "waiting_internal",
        "escalated",
        "reopened",
      ]),
    )
    .orderBy(asc(supportTickets.createdAt));

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <h1 className="font-display text-[32px] font-medium leading-tight">Moderation queue</h1>
        <p className="mt-1 text-sm text-muted">
          {queue.length} listing{queue.length === 1 ? "" : "s"} waiting ·{" "}
          {pendingVerifications.length} verification case
          {pendingVerifications.length === 1 ? "" : "s"} pending ·{" "}
          {openReports.length} report{openReports.length === 1 ? "" : "s"} open ·{" "}
          {pendingBoosts.length} featured request{pendingBoosts.length === 1 ? "" : "s"} pending ·{" "}
          {pendingReviews.length} review{pendingReviews.length === 1 ? "" : "s"} pending ·{" "}
          {openTickets.length} support ticket{openTickets.length === 1 ? "" : "s"} open
          · every action is recorded in the audit log
        </p>
      </div>

      {queue.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          The queue is clear. New submissions appear here before anything goes
          public.
        </Card>
      ) : (
        <div className="space-y-4">
          {queue.map(({ listing: l, seller }) => (
            <Card key={l.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">
                      {l.make} {l.model} {l.variant ?? ""} — {l.year}
                    </h2>
                    <Badge tone="review">
                      {l.status === "correction" ? "In correction" : "Under review"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatPkr(l.askingPricePkr)} · {formatKm(l.mileageKm)} ·{" "}
                    {l.city} · submitted {formatDate(l.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Seller: {seller.displayName ?? "No name"} ({seller.phone})
                  </p>
                  {l.disclosures && (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted">
                      <li>Paint: {l.disclosures.paintedPanels || "—"}</li>
                      <li>Accidents: {l.disclosures.accidentHistory || "—"}</li>
                      <li>Mechanical: {l.disclosures.mechanicalIssues || "—"}</li>
                      <li>Documents: {l.disclosures.documents || "—"}</li>
                    </ul>
                  )}
                </div>

                <div className="flex w-full max-w-sm flex-col gap-2">
                  <form action={moderateListingAction} className="flex gap-2">
                    <input type="hidden" name="listingId" value={l.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <Button type="submit" className="flex-1">
                      Approve &amp; publish
                    </Button>
                  </form>
                  <form action={moderateListingAction} className="flex gap-2">
                    <input type="hidden" name="listingId" value={l.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <Input
                      name="reason"
                      placeholder="Exact correction needed (required)"
                      required
                      className="flex-1"
                    />
                    <Button type="submit" variant="secondary">
                      Request correction
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div id="verification" className="scroll-mt-20">
        <h2 className="font-display text-2xl font-medium leading-tight">Verification queue</h2>
        <p className="mt-1 text-sm text-muted">
          Identity &amp; ownership documents pending review.
        </p>
      </div>

      {pendingVerifications.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No verification cases waiting.</Card>
      ) : (
        <div className="space-y-4">
          {pendingVerifications.map(({ verificationCase: v, applicant }) => (
            <Card key={v.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {applicant.displayName ?? "No name"} ({applicant.phone})
                  </h3>
                  <p className="mt-1 text-sm capitalize text-muted">
                    Claims: {v.relationship ?? "not specified"} · submitted {formatDate(v.createdAt)}
                  </p>
                  <div className="mt-2 flex gap-3 text-[13px] font-semibold text-brand">
                    {v.identityDocKey && (
                      <a href={`/api/verification-docs/${v.id}/identity`} target="_blank" rel="noreferrer">
                        View ID document
                      </a>
                    )}
                    {v.ownershipDocKey && (
                      <a href={`/api/verification-docs/${v.id}/ownership`} target="_blank" rel="noreferrer">
                        View ownership document
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex w-full max-w-sm flex-col gap-2">
                  <form action={approveVerificationAction} className="flex gap-2">
                    <input type="hidden" name="caseId" value={v.id} />
                    <Button type="submit" className="flex-1">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectVerificationAction} className="flex gap-2">
                    <input type="hidden" name="caseId" value={v.id} />
                    <Input name="reason" placeholder="Reason (required)" required className="flex-1" />
                    <Button type="submit" variant="secondary">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div id="featured" className="scroll-mt-20">
        <h2 className="font-display text-2xl font-medium leading-tight">Featured listing requests</h2>
        <p className="mt-1 text-sm text-muted">
          Sellers request a plan from their dashboard — approving starts the boost
          immediately (billing isn&apos;t wired up yet, so this is a manual stand-in
          for a future payment step).
        </p>
      </div>

      {pendingBoosts.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No featured requests waiting.</Card>
      ) : (
        <div className="space-y-4">
          {pendingBoosts.map(({ boost: b, listing: l, plan, seller }) => (
            <Card key={b.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {l.make} {l.model} {l.year} — {formatPkr(l.askingPricePkr)}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {plan.name} · {plan.durationDays} days · {formatPkr(plan.pricePkr)} ·
                    requested {formatDate(b.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Seller: {seller.displayName ?? "No name"} ({seller.phone})
                  </p>
                </div>

                <div className="flex w-full max-w-sm flex-col gap-2">
                  <form action={approveBoostAction} className="flex gap-2">
                    <input type="hidden" name="boostId" value={b.id} />
                    <Button type="submit" className="flex-1">
                      Approve &amp; feature now
                    </Button>
                  </form>
                  <form action={rejectBoostAction} className="flex gap-2">
                    <input type="hidden" name="boostId" value={b.id} />
                    <Input name="reason" placeholder="Reason (required)" required className="flex-1" />
                    <Button type="submit" variant="secondary">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl font-medium leading-tight">Active featured listings</h2>
        <p className="mt-1 text-sm text-muted">
          Expires automatically via the sweep-boosts cron job — Featured Analytics
          below is a best-effort count, not a full analytics pipeline.
        </p>
      </div>

      {activeBoosts.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No listings are currently featured.</Card>
      ) : (
        <div className="space-y-4">
          {activeBoosts.map(({ boost: b, listing: l, plan }) => (
            <Card key={b.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {l.make} {l.model} {l.year}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {plan.name} · expires {b.expiresAt ? formatDate(b.expiresAt) : "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {b.impressionCount} homepage impression{b.impressionCount === 1 ? "" : "s"} ·{" "}
                    {b.clickCount} detail view{b.clickCount === 1 ? "" : "s"}
                  </p>
                </div>
                <form action={cancelActiveBoostAction}>
                  <input type="hidden" name="boostId" value={b.id} />
                  <Button type="submit" variant="tertiary" className="text-xs">
                    End early
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div id="reports" className="scroll-mt-20">
        <h2 className="font-display text-2xl font-medium leading-tight">Reports</h2>
        <p className="mt-1 text-sm text-muted">
          Listings and users flagged by buyers or sellers.
        </p>
      </div>

      {openReports.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No open reports.</Card>
      ) : (
        <div className="space-y-4">
          {openReports.map(({ report: r, reporter, listing: l, reportedUser }) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {REPORT_CATEGORY_LABELS[r.category] ?? r.category}
                    </h3>
                    <Badge tone="review" className="capitalize">
                      {r.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Reported by {reporter.displayName ?? "No name"} ({reporter.phone}) ·{" "}
                    {formatDate(r.createdAt)}
                  </p>
                  {l && (
                    <p className="mt-1 text-sm text-muted">
                      Listing: {l.make} {l.model} {l.year}
                    </p>
                  )}
                  {reportedUser && (
                    <p className="mt-1 text-sm text-muted">
                      Reported user: {reportedUser.displayName ?? "No name"} ({reportedUser.phone})
                    </p>
                  )}
                  {r.detail && <p className="mt-2 text-sm">{r.detail}</p>}
                </div>

                <form action={updateReportStatusAction} className="flex w-full max-w-xs gap-2">
                  <input type="hidden" name="reportId" value={r.id} />
                  <Select name="status" defaultValue="triaged" className="flex-1">
                    <option value="triaged">Triaged</option>
                    <option value="investigating">Investigating</option>
                    <option value="actioned">Actioned</option>
                    <option value="closed">Closed</option>
                  </Select>
                  <Button type="submit" variant="secondary">
                    Update
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl font-medium leading-tight">Reviews</h2>
        <p className="mt-1 text-sm text-muted">
          Customer reviews waiting for a check before they appear on the homepage.
        </p>
      </div>

      {pendingReviews.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No reviews waiting.</Card>
      ) : (
        <div className="space-y-4">
          {pendingReviews.map(({ review: r, author }) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)} {r.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {r.isAnonymous ? "Posted anonymously" : r.displayName} · submitted from{" "}
                    {author.displayName ?? "No name"} ({author.phone}) · {formatDate(r.createdAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
                </div>

                <div className="flex w-full max-w-sm flex-col gap-2">
                  <form action={approveReviewAction} className="flex gap-2">
                    <input type="hidden" name="reviewId" value={r.id} />
                    <Button type="submit" className="flex-1">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectReviewAction} className="flex gap-2">
                    <input type="hidden" name="reviewId" value={r.id} />
                    <Input name="reason" placeholder="Reason (required)" required className="flex-1" />
                    <Button type="submit" variant="secondary">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl font-medium leading-tight">Support tickets</h2>
        <p className="mt-1 text-sm text-muted">Open tickets awaiting a response.</p>
      </div>

      {openTickets.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No open support tickets.</Card>
      ) : (
        <div className="space-y-4">
          {openTickets.map(({ ticket: t, requester }) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      #{t.ticketNumber} {t.subject}
                    </h3>
                    <Badge tone={TICKET_SEVERITY_TONE[t.severity] ?? "neutral"} className="capitalize">
                      {t.severity}
                    </Badge>
                    <Badge tone="neutral">{TICKET_STATUS_LABEL[t.status] ?? t.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {requester.displayName ?? "No name"} ({requester.phone}) ·{" "}
                    {formatDate(t.createdAt)}
                  </p>
                  <Link
                    href={`/dashboard/support/${t.id}`}
                    className="mt-2 inline-block text-[13px] font-semibold text-brand hover:text-brand-strong"
                  >
                    View &amp; reply →
                  </Link>
                </div>

                <form action={updateTicketStatusAction} className="flex w-full max-w-xs gap-2">
                  <input type="hidden" name="ticketId" value={t.id} />
                  <Select name="status" defaultValue="assigned" className="flex-1">
                    <option value="assigned">Assigned</option>
                    <option value="waiting_user">Waiting on user</option>
                    <option value="waiting_internal">With our team</option>
                    <option value="escalated">Escalated</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </Select>
                  <Button type="submit" variant="secondary">
                    Update
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
