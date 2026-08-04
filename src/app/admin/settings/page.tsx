import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/constants";
import { Badge, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Admin — site settings" };

type ConfigRow = { label: string; detail: string; on: boolean };

function getConfigRows(): ConfigRow[] {
  const storageConfigured = !!(process.env.STORAGE_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const privateStorageConfigured = !!process.env.STORAGE_PRIVATE_BUCKET;
  const emailConfigured = !!process.env.RESEND_API_KEY;
  const cronConfigured = !!process.env.CRON_SECRET;
  const siteUrlConfigured = !!process.env.NEXT_PUBLIC_SITE_URL;

  return [
    {
      label: "Email verification required at sign-up",
      detail: EMAIL_VERIFICATION_REQUIRED ? "Required" : "Not required (pending domain verification)",
      on: EMAIL_VERIFICATION_REQUIRED,
    },
    {
      label: "Public object storage (listing photos, avatars, dealer assets)",
      detail: storageConfigured ? "Neon/S3-compatible storage configured" : "Using local disk (dev mode)",
      on: storageConfigured,
    },
    {
      label: "Private document storage (verification documents)",
      detail: privateStorageConfigured ? "Private bucket configured" : "Using local disk (dev mode)",
      on: privateStorageConfigured,
    },
    {
      label: "Transactional email (Resend)",
      detail: emailConfigured ? "API key configured" : "Not configured",
      on: emailConfigured,
    },
    {
      label: "Scheduled jobs (sweep-listings, sweep-boosts)",
      detail: cronConfigured ? "Cron secret configured" : "Not configured — cron endpoints will reject requests",
      on: cronConfigured,
    },
    {
      label: "Public site URL",
      detail: siteUrlConfigured ? process.env.NEXT_PUBLIC_SITE_URL! : "Not set — falling back to localhost",
      on: siteUrlConfigured,
    },
  ];
}

export default async function AdminSettingsPage() {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  const rows = getConfigRows();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-[32px] font-medium leading-tight">Site settings</h1>
        <p className="mt-1 text-sm text-muted">
          A read-only view of how this deployment is currently configured — these are real
          environment variables, not editable toggles. Changing any of them requires
          updating the deployment&apos;s environment configuration directly.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.label} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[13px] font-semibold">{r.label}</p>
              <p className="mt-0.5 text-[13px] text-muted">{r.detail}</p>
            </div>
            <Badge tone={r.on ? "verified" : "review"} className="shrink-0">
              {r.on ? "Configured" : "Needs attention"}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
