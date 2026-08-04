import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, sessions, siteSettings, users } from "@/db";

// File is named proxy.ts, not middleware.ts — Next 16 renamed the convention (the old
// middleware.ts file would simply be ignored). Runs on the Node.js runtime by default in
// this version, which is what lets it query the real database directly below instead of
// needing an Edge-safe workaround.

const SESSION_COOKIE = "sd_session";
const STAFF_ROLES = new Set(["reviewer", "moderator", "support", "admin"]);

// Routes maintenance mode must never block, even while it's on — otherwise turning it on
// would make it impossible for staff to sign in and turn it back off again.
const ALWAYS_ALLOWED_PREFIXES = [
  "/admin",
  "/api",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/complete-profile",
  "/account-created",
  "/google-bridge",
  "/welcome",
];

async function isStaffSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [row] = await db
    .select({ role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())));
  return !!row && STAFF_ROLES.has(row.role);
}

function maintenancePage(siteName: string, message: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${siteName} — Maintenance</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: -apple-system, Inter, Arial, sans-serif; background: #F8FAFC; color: #0F172A; }
  .card { max-width: 420px; text-align: center; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 12px; }
  p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0; }
</style>
</head>
<body>
  <div class="card">
    <h1>${siteName}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new Response(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "retry-after": "3600" } });
}

export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl;
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const [row] = await db.select({ general: siteSettings.general, maintenance: siteSettings.maintenance }).from(siteSettings).where(eq(siteSettings.id, "default"));
  if (!row?.maintenance?.enabled) return NextResponse.next();

  const staff = await isStaffSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (staff) return NextResponse.next();

  return maintenancePage(
    row.general?.siteName || "SeedhiDeal",
    row.maintenance.message || "We're performing scheduled maintenance and will be back shortly.",
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
