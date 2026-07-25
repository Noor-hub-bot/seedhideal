import { db, notifications } from "@/db";

/**
 * Single choke-point for every in-app notification this app sends. Every
 * server action that used to call `db.insert(notifications).values(...)`
 * directly now calls this instead — the only place a future email/push
 * integration needs to change is the body of this function, never any of
 * its call sites.
 */
export async function notify(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
}): Promise<void> {
  await db.insert(notifications).values(params);
}
