import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { createSessionForUser } from "@/lib/auth";
import { db, users } from "@/db";

// Internal, unstyled hop — not a user-facing screen. Reads the transient NextAuth
// session created by the Google OAuth callback exactly once, issues our own
// sd_session cookie (same mechanism password/email sign-in uses), then hands off
// to the rest of the app, which never needs to know NextAuth was involved.
export default async function GoogleBridgePage() {
  const session = await auth();
  const appUserId = session?.appUserId;
  if (!appUserId) redirect("/sign-in");

  await createSessionForUser(appUserId);

  const [user] = await db.select().from(users).where(eq(users.id, appUserId));
  redirect(user?.city ? "/dashboard" : "/complete-profile");
}
