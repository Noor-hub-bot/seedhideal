"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auditLog, db, supportTickets, ticketMessages } from "@/db";
import { getSessionUser, isStaff, requireStaff } from "@/lib/auth";
import { notify } from "@/lib/notify";

const SEVERITIES = new Set(["low", "standard", "payment", "safety"]);

export type TicketFormState = { error?: string };

export async function createTicketAction(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/support/new");

  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const severity = String(formData.get("severity") ?? "standard");
  const body = String(formData.get("body") ?? "").trim();
  if (!subject) return { error: "Add a short subject." };
  if (!SEVERITIES.has(severity)) return { error: "Choose a severity." };
  if (body.length < 5) return { error: "Describe your issue." };
  if (body.length > 4000) return { error: "Message is too long." };

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      userId: user.id,
      subject,
      severity: severity as "low" | "standard" | "payment" | "safety",
      status: "new",
    })
    .returning();

  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    senderId: user.id,
    isStaff: false,
    body,
  });

  redirect(`/dashboard/support/${ticket.id}`);
}

export type TicketReplyState = { error?: string };

export async function replyToTicketAction(
  _prev: TicketReplyState,
  formData: FormData,
): Promise<TicketReplyState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const ticketId = String(formData.get("ticketId"));
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 2) return { error: "Write a message." };
  if (body.length > 4000) return { error: "Message is too long." };

  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (!ticket) return { error: "Ticket not found." };
  const staff = isStaff(user);
  if (ticket.userId !== user.id && !staff) {
    return { error: "You don't have access to this ticket." };
  }

  await db.insert(ticketMessages).values({ ticketId, senderId: user.id, isStaff: staff, body });

  const newStatus = staff
    ? "waiting_user"
    : ["resolved", "closed"].includes(ticket.status)
      ? "reopened"
      : "waiting_internal";
  if (newStatus !== ticket.status) {
    await db
      .update(supportTickets)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId));
  }

  if (staff) {
    await notify({
      userId: ticket.userId,
      type: "ticket_reply",
      title: `Reply on your ticket: ${ticket.subject}`,
      href: `/dashboard/support/${ticketId}`,
    });
  }

  revalidatePath(`/dashboard/support/${ticketId}`);
  revalidatePath("/dashboard/support");
  revalidatePath("/admin");
  return {};
}

const STAFF_STATUSES = new Set([
  "assigned",
  "waiting_user",
  "waiting_internal",
  "escalated",
  "resolved",
  "closed",
]);

export async function updateTicketStatusAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const ticketId = String(formData.get("ticketId"));
  const status = String(formData.get("status"));
  if (!STAFF_STATUSES.has(status)) return;

  const [existing] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (!existing) return;

  await db
    .update(supportTickets)
    .set({
      status: status as
        | "assigned"
        | "waiting_user"
        | "waiting_internal"
        | "escalated"
        | "resolved"
        | "closed",
      assigneeId: existing.assigneeId ?? staff.id,
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, ticketId));

  await db.insert(auditLog).values({
    actorId: staff.id,
    objectType: "support_ticket",
    objectId: ticketId,
    action: "status_updated",
    priorState: existing.status,
    newState: status,
  });

  revalidatePath("/admin");
  revalidatePath(`/dashboard/support/${ticketId}`);
}
