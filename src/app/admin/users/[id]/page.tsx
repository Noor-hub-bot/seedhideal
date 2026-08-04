import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, listings, users, verificationCases } from "@/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatDate, formatPkr } from "@/lib/format";
import { EmptyState } from "@/components/admin/section-card";
import { AdminUserActions } from "@/components/admin/user-actions";
import type { UserSummary } from "@/lib/admin/users";

export const metadata: Metadata = { title: "Admin — user profile" };

const STATUS_TONE: Record<string, "verified" | "review" | "neutral"> = {
  active: "verified",
  submitted: "review",
  under_review: "review",
  correction: "review",
  sold: "neutral",
  expired: "neutral",
  closed: "neutral",
  paused: "neutral",
  suspended: "review",
  draft: "neutral",
};

const VERIFICATION_TONE: Record<string, "verified" | "review" | "neutral"> = {
  verified: "verified",
  pending: "review",
  action_required: "review",
  rejected: "neutral",
  expired: "neutral",
  suspended: "neutral",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getSessionUser();
  if (!viewer || !isStaff(viewer)) redirect("/");

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [profileUser] = await db.select().from(users).where(eq(users.id, id));
  if (!profileUser) notFound();

  const [userListings, verificationHistory] = await Promise.all([
    db.select().from(listings).where(eq(listings.sellerId, id)).orderBy(desc(listings.createdAt)),
    db
      .select()
      .from(verificationCases)
      .where(eq(verificationCases.userId, id))
      .orderBy(desc(verificationCases.createdAt)),
  ]);

  // Built from the queries above rather than a second call to getUserSummaries — this
  // page already has everything needed (listing count, verification history) to
  // compute the same shape AdminUserActions expects.
  const pendingCase = verificationHistory.find((v) => v.status === "pending");
  const userSummary: UserSummary = {
    id: profileUser.id,
    displayName: profileUser.displayName,
    email: profileUser.email,
    avatarUrl: profileUser.avatarUrl,
    createdAt: profileUser.createdAt,
    role: profileUser.role,
    status: profileUser.status,
    listingCount: userListings.length,
    verificationStatus: verificationHistory.some((v) => v.status === "verified") ? "verified" : pendingCase ? "pending" : "none",
    pendingVerificationCaseId: pendingCase?.id ?? null,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <Link href="/admin/users" className="text-[13px] font-semibold text-muted hover:text-foreground">
        ← Back to users
      </Link>

      <div className="flex flex-wrap items-center gap-5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-chip">
          {profileUser.avatarUrl ? (
            <Image src={profileUser.avatarUrl} alt={profileUser.displayName ?? "User"} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-2xl font-medium text-muted">
              {(profileUser.displayName ?? profileUser.email ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium leading-tight">{profileUser.displayName ?? "No name"}</h1>
          <p className="mt-1 text-sm text-muted">
            {profileUser.email ?? "No email on file"} {profileUser.phone ? `· ${profileUser.phone}` : ""}
          </p>
          <p className="mt-1 text-[13px] text-muted">Joined {formatDate(profileUser.createdAt)}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-medium">Manage</h2>
        <AdminUserActions user={userSummary} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-medium">Listings ({userListings.length})</h2>
        {userListings.length === 0 ? (
          <EmptyState>This user hasn&apos;t created any listings.</EmptyState>
        ) : (
          <div className="space-y-3">
            {userListings.map((l) => (
              <Card key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/cars/${l.id}`} target="_blank" className="font-semibold hover:text-brand">
                    {l.make} {l.model} {l.variant ?? ""} — {l.year}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {formatPkr(l.askingPricePkr)} · {l.city} · submitted {formatDate(l.createdAt)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[l.status] ?? "neutral"} className="shrink-0 capitalize">
                  {l.status.replace(/_/g, " ")}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-medium">Verification history ({verificationHistory.length})</h2>
        {verificationHistory.length === 0 ? (
          <EmptyState>No verification cases on file.</EmptyState>
        ) : (
          <div className="space-y-3">
            {verificationHistory.map((v) => (
              <Card key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold capitalize">{v.relationship ?? "Not specified"}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Submitted {formatDate(v.createdAt)}
                    {v.reviewedAt ? ` · reviewed ${formatDate(v.reviewedAt)}` : ""}
                  </p>
                  {v.reviewerNote && <p className="mt-1 text-[13px] text-muted">{v.reviewerNote}</p>}
                </div>
                <Badge tone={VERIFICATION_TONE[v.status] ?? "neutral"} className="shrink-0 capitalize">
                  {v.status.replace(/_/g, " ")}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
