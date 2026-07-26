import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, notifications } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Button, Card } from "@/components/ui";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/notifications");

  const myNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const hasUnread = myNotifications.some((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium leading-tight">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="secondary" className="px-3 py-2 text-xs">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {myNotifications.length === 0 ? (
        <Card className="p-6 text-sm text-muted">Nothing yet.</Card>
      ) : (
        <div className="space-y-2">
          {myNotifications.map((n) => (
            <Card
              key={n.id}
              className={`flex items-start justify-between gap-3 p-3 text-sm ${n.readAt ? "" : "border-brand/40 bg-brand-soft/40"}`}
            >
              <div className="min-w-0">
                {n.href ? (
                  <Link href={n.href} className="font-medium text-brand hover:text-brand-strong">
                    {n.title}
                  </Link>
                ) : (
                  <p className="font-medium">{n.title}</p>
                )}
                {n.body && <p className="mt-0.5 text-muted">{n.body}</p>}
                <p className="mt-0.5 text-xs text-muted">{formatDate(n.createdAt)}</p>
              </div>
              {!n.readAt && (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="notificationId" value={n.id} />
                  <Button type="submit" variant="tertiary" className="whitespace-nowrap px-2 py-1 text-xs">
                    Mark read
                  </Button>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
