"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db, notifications } from "@/db";
import { getSessionUser } from "@/lib/auth";

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const notificationId = String(formData.get("notificationId"));

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));

  revalidatePath("/dashboard/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  revalidatePath("/dashboard/notifications");
}
