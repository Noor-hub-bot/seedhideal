import { sql } from "drizzle-orm";
import { db } from "@/db";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/constants";
import { getEmailConfigSummary } from "@/lib/email";
import packageJson from "../../../package.json";

export type StatusRow = { label: string; detail: string; on: boolean };

/** A real `select 1` round-trip, not just "is DATABASE_URL set" — the only way to
 * honestly know the database is actually reachable right now, not merely configured. */
async function getDatabaseStatus(): Promise<StatusRow> {
  try {
    await db.execute(sql`select 1`);
    return { label: "Database", detail: "Connected (Neon Postgres)", on: true };
  } catch (e) {
    return { label: "Database", detail: e instanceof Error ? e.message : "Connection failed", on: false };
  }
}

function getStorageStatus(): StatusRow {
  const storageConfigured = !!(process.env.STORAGE_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const privateStorageConfigured = !!process.env.STORAGE_PRIVATE_BUCKET;
  return {
    label: "Storage",
    detail: storageConfigured
      ? privateStorageConfigured
        ? "Public + private object storage configured"
        : "Public object storage configured, private bucket missing"
      : "Using local disk (dev mode)",
    on: storageConfigured && privateStorageConfigured,
  };
}

function getEmailStatus(): StatusRow {
  const email = getEmailConfigSummary();
  return { label: "Email", detail: `${email.provider} · sender ${email.senderEmail}`, on: email.configured };
}

function getAuthStatus(): StatusRow {
  // Every request that renders this page already passed a real staff session check
  // (requireStaff), so authentication is demonstrably working — the useful signal here
  // is whether OTP delivery (the mechanism new sign-ins depend on) is real or console-only.
  const email = getEmailConfigSummary();
  return {
    label: "Authentication",
    detail: EMAIL_VERIFICATION_REQUIRED
      ? `Sessions + email OTP operational (${email.provider})`
      : `Sessions operational — email verification not yet required (${email.provider})`,
    on: true,
  };
}

export type SystemInfo = { version: string; environment: string; buildRef: string };

function getSystemInfo(): SystemInfo {
  return {
    version: packageJson.version,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    buildRef: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
  };
}

export async function getSystemStatus(): Promise<{ rows: StatusRow[]; info: SystemInfo }> {
  const [database, storage, email, auth] = await Promise.all([
    getDatabaseStatus(),
    Promise.resolve(getStorageStatus()),
    Promise.resolve(getEmailStatus()),
    Promise.resolve(getAuthStatus()),
  ]);
  return { rows: [database, storage, email, auth], info: getSystemInfo() };
}
