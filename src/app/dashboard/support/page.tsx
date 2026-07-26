import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, supportTickets } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Badge, ButtonLink, Card, Heading } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Support tickets" };

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  assigned: "Assigned",
  waiting_user: "Waiting on you",
  waiting_internal: "With our team",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

export default async function SupportListPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/support");

  const tickets = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.userId, user.id))
    .orderBy(desc(supportTickets.createdAt));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Heading size="lg">Support tickets</Heading>
        <ButtonLink href="/dashboard/support/new">New ticket</ButtonLink>
      </div>
      {tickets.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          No support tickets yet. Open one if you run into an issue.
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/dashboard/support/${t.id}`}>
              <Card className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    #{t.ticketNumber} · {formatDate(t.createdAt)}
                  </p>
                </div>
                <Badge tone="neutral">{STATUS_LABEL[t.status] ?? t.status}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
