import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, supportTickets, ticketMessages, users } from "@/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { Badge, Card, Heading } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { TicketReplyForm } from "./reply-form";

export const metadata: Metadata = { title: "Support ticket" };

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

export default async function TicketThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getSessionUser();
  if (!viewer) redirect(`/sign-in?next=/dashboard/support/${id}`);

  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
  if (!ticket) notFound();

  const staffViewer = isStaff(viewer);
  if (ticket.userId !== viewer.id && !staffViewer) notFound();

  const thread = await db
    .select({ message: ticketMessages, sender: users })
    .from(ticketMessages)
    .innerJoin(users, eq(ticketMessages.senderId, users.id))
    .where(eq(ticketMessages.ticketId, id))
    .orderBy(asc(ticketMessages.createdAt));

  const closed = ["resolved", "closed"].includes(ticket.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={staffViewer ? "/admin" : "/dashboard/support"}
        className="text-[13px] font-semibold text-muted hover:text-foreground"
      >
        ← Back
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading size="md">{ticket.subject}</Heading>
          <p className="mt-1 text-sm text-muted">Ticket #{ticket.ticketNumber}</p>
        </div>
        <Badge tone={closed ? "neutral" : "review"}>{STATUS_LABEL[ticket.status] ?? ticket.status}</Badge>
      </div>

      <div className="mt-6 space-y-3">
        {thread.map(({ message, sender }) => {
          const mine = sender.id === viewer.id;
          return (
            <Card
              key={message.id}
              className={`max-w-[85%] p-3.5 ${mine ? "ml-auto bg-brand-soft" : ""}`}
            >
              <p className="mb-1 text-[12px] font-semibold text-muted">
                {mine ? "You" : message.isStaff ? "SeedhiDeal Support" : sender.displayName ?? "User"}
              </p>
              <p className="whitespace-pre-wrap text-sm">{message.body}</p>
              <p className="mt-1 text-[11px] text-muted">{formatDate(message.createdAt)}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        {closed && (
          <Card className="p-4 text-sm text-muted">
            This ticket is {ticket.status}. Sending a reply will reopen it.
          </Card>
        )}
        <TicketReplyForm ticketId={ticket.id} />
      </div>
    </div>
  );
}
