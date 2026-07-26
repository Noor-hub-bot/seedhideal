import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auditLog, db } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Activity" };

const ACTION_LABEL: Record<string, string> = {
  submitted: "Submitted listing",
  approved: "Approved",
  correction_requested: "Correction requested",
  marked_sold: "Marked sold",
  paused: "Paused listing",
  resumed: "Resumed listing",
  withdrawn: "Withdrew listing",
  expired: "Listing expired",
  rejected: "Rejected",
};

// Real timeline from the existing audit_log table, filtered to actions this
// user performed — no new schema needed.
export default async function ActivityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/activity");

  const activity = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.actorId, user.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10">
      <h1 className="mb-1.5 font-display text-2xl font-medium leading-tight">Activity</h1>
      <p className="mb-6 text-sm text-muted">A timeline of actions on your account and listings.</p>

      {activity.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No activity yet.</Card>
      ) : (
        <div className="space-y-2">
          {activity.map((a) => (
            <Card key={a.id} className="p-3 text-sm">
              <p className="font-medium">
                {ACTION_LABEL[a.action] ?? a.action}
                {a.objectType && <span className="capitalize text-muted"> · {a.objectType.replace("_", " ")}</span>}
              </p>
              {a.reason && <p className="mt-0.5 text-muted">{a.reason}</p>}
              <p className="mt-0.5 text-xs text-muted">{formatDate(a.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
