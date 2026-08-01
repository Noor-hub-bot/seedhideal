import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { createSessionForUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { db, users } from "@/db";

// Internal, unstyled hop — not a user-facing screen. Reads the transient NextAuth
// session created by the Google OAuth callback exactly once, issues our own
// sd_session cookie (same mechanism password/email sign-in uses), then hands off
// to the rest of the app, which never needs to know NextAuth was involved.
//
// A Route Handler, not a page: in the Next.js App Router, cookies() may only be
// *written* from a Server Action or a Route Handler — a page/Server Component
// may only *read* cookies during render. createSessionForUser() no longer touches
// cookies() itself (that threw "Cookies can only be modified in a Server Action or
// Route Handler" in production, since Next treated this call as originating from a
// component read path); instead we set SESSION_COOKIE directly on the redirect
// response below, which is always valid from a Route Handler.
export async function GET(request: NextRequest) {
  const session = await auth();
  const appUserId = session?.appUserId;
  if (!appUserId) return NextResponse.redirect(new URL("/sign-in", request.url));

  const { token, expiresAt } = await createSessionForUser(appUserId);

  const [user] = await db.select().from(users).where(eq(users.id, appUserId));
  const response = NextResponse.redirect(new URL(user?.city ? "/dashboard" : "/complete-profile", request.url));
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return response;
}
