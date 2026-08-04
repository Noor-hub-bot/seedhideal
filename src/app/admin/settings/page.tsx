import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { getSystemStatus } from "@/lib/admin/system-status";
import { getEmailConfigSummary } from "@/lib/email";
import { Badge, Card, Input, Select, Textarea } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsSectionForm, Field } from "@/components/admin/settings-form";
import { MediaField } from "@/components/admin/settings-media-field";
import { TestEmailButton } from "@/components/admin/test-email-button";
import {
  saveFooterSettingsAction,
  saveGeneralSettingsAction,
  saveHomepageSettingsAction,
  saveMaintenanceSettingsAction,
  saveMediaSettingsAction,
  saveSeoSettingsAction,
  saveSocialSettingsAction,
} from "@/lib/actions/admin-settings";

export const metadata: Metadata = { title: "Admin — website settings" };

const TIMEZONES = ["Asia/Karachi", "Asia/Dubai", "Asia/Kolkata", "Europe/London", "America/New_York", "UTC"];
const CURRENCIES = ["PKR", "USD", "AED", "GBP", "EUR"];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
];

const HOMEPAGE_SECTIONS: { key: keyof Awaited<ReturnType<typeof getSiteSettings>>["homepage"]["sections"]; label: string }[] = [
  { key: "browseBy", label: "Browse by brand / body type / budget" },
  { key: "recentlyAdded", label: "Recently added" },
  { key: "featuredCars", label: "Featured cars" },
  { key: "verifiedSellers", label: "Verified sellers" },
  { key: "socialProof", label: "Dealers & reviews" },
  { key: "statisticsBand", label: "Statistics band" },
  { key: "trustComparison", label: "Trust comparison" },
  { key: "howItWorks", label: "How it works" },
  { key: "whySeedhiDeal", label: "Why SeedhiDeal" },
  { key: "downloadApp", label: "Download app" },
  { key: "newsletter", label: "Newsletter" },
  { key: "faq", label: "FAQ" },
];

export default async function AdminSettingsPage() {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  const [settings, system] = await Promise.all([getSiteSettings(), getSystemStatus()]);
  const { general, homepage, social, footer, seo, media, maintenance } = settings;
  const email = getEmailConfigSummary();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-[32px] font-medium leading-tight">Website settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage everything visitors see on the live site. Changes save immediately — no deploy required.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
          <TabsTrigger value="social">Contact &amp; Social</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* ---------- GENERAL ---------- */}
        <TabsContent value="general">
          <SettingsSectionForm action={saveGeneralSettingsAction}>
            <Field label="Website name">
              <Input name="siteName" defaultValue={general.siteName} required maxLength={80} />
            </Field>
            <Field label="Website description" hint="Used as the default meta description when a page sets none of its own.">
              <Textarea name="description" defaultValue={general.description} rows={3} maxLength={300} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Support email">
                <Input name="supportEmail" type="email" defaultValue={general.supportEmail} placeholder="support@example.com" />
              </Field>
              <Field label="Support phone">
                <Input name="supportPhone" defaultValue={general.supportPhone} placeholder="+92 300 0000000" />
              </Field>
              <Field label="WhatsApp number" hint="Digits only work best, e.g. +923000000000.">
                <Input name="whatsappNumber" defaultValue={general.whatsappNumber} placeholder="+923000000000" />
              </Field>
              <Field label="Business address">
                <Input name="address" defaultValue={general.address} />
              </Field>
              <Field label="Timezone">
                <Select name="timezone" defaultValue={general.timezone}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Currency"
                hint="Recorded for reference — prices across the marketplace are formatted in PKR regardless of this setting."
              >
                <Select name="currency" defaultValue={general.currency}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Language" hint="Sets the site's html lang attribute. Only English copy exists today.">
                <Select name="language" defaultValue={general.language}>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </SettingsSectionForm>
        </TabsContent>

        {/* ---------- HOMEPAGE ---------- */}
        <TabsContent value="homepage">
          <SettingsSectionForm action={saveHomepageSettingsAction}>
            <Field label="Hero title">
              <Input name="heroTitle" defaultValue={homepage.heroTitle} required maxLength={120} />
            </Field>
            <Field label="Hero subtitle">
              <Textarea name="heroSubtitle" defaultValue={homepage.heroSubtitle} rows={3} maxLength={400} />
            </Field>
            <MediaField
              label="Hero background image"
              name="heroBackgroundImage"
              hint="Optional. Shown as a subtle background behind the hero text."
              currentUrl={homepage.heroBackgroundImage}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary button text">
                <Input name="heroButtonText" defaultValue={homepage.heroButtonText} />
              </Field>
              <Field label="Primary button link">
                <Input name="heroButtonLink" defaultValue={homepage.heroButtonLink} placeholder="/sell" />
              </Field>
              <Field label="Secondary button text">
                <Input name="heroButtonSecondaryText" defaultValue={homepage.heroButtonSecondaryText} />
              </Field>
              <Field label="Secondary button link">
                <Input name="heroButtonSecondaryLink" defaultValue={homepage.heroButtonSecondaryLink} placeholder="/cars" />
              </Field>
            </div>

            <div>
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">Homepage statistics</h3>
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid grid-cols-2 gap-3">
                    <Input name={`statValue${i}`} defaultValue={homepage.stats[i]?.value ?? ""} placeholder="Value, e.g. 100%" />
                    <Input name={`statLabel${i}`} defaultValue={homepage.stats[i]?.label ?? ""} placeholder="Label" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">Show / hide sections</h3>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {HOMEPAGE_SECTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2.5 text-[13px]">
                    <input
                      type="checkbox"
                      name={`section_${s.key}`}
                      defaultChecked={homepage.sections[s.key]}
                      className="h-4 w-4 rounded border-border-input accent-[var(--color-brand)]"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </SettingsSectionForm>
        </TabsContent>

        {/* ---------- CONTACT & SOCIAL ---------- */}
        <TabsContent value="social">
          <SettingsSectionForm action={saveSocialSettingsAction}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Facebook">
                <Input name="facebook" type="url" defaultValue={social.facebook} placeholder="https://facebook.com/..." />
              </Field>
              <Field label="Instagram">
                <Input name="instagram" type="url" defaultValue={social.instagram} placeholder="https://instagram.com/..." />
              </Field>
              <Field label="YouTube">
                <Input name="youtube" type="url" defaultValue={social.youtube} placeholder="https://youtube.com/..." />
              </Field>
              <Field label="TikTok">
                <Input name="tiktok" type="url" defaultValue={social.tiktok} placeholder="https://tiktok.com/..." />
              </Field>
              <Field label="LinkedIn">
                <Input name="linkedin" type="url" defaultValue={social.linkedin} placeholder="https://linkedin.com/..." />
              </Field>
              <Field label="X (Twitter)">
                <Input name="twitter" type="url" defaultValue={social.twitter} placeholder="https://x.com/..." />
              </Field>
              <Field label="WhatsApp" hint="Shown as a footer contact link if different from the General tab's WhatsApp number.">
                <Input name="whatsapp" defaultValue={social.whatsapp} placeholder="+923000000000" />
              </Field>
            </div>
            <Field label="Google Maps embed URL" hint="The src= URL from Google Maps' Share > Embed a map dialog. Shown in the footer.">
              <Input name="googleMapsEmbed" type="url" defaultValue={social.googleMapsEmbed} placeholder="https://www.google.com/maps/embed?..." />
            </Field>
          </SettingsSectionForm>
        </TabsContent>

        {/* ---------- FOOTER ---------- */}
        <TabsContent value="footer">
          <SettingsSectionForm action={saveFooterSettingsAction}>
            <Field label="Footer text">
              <Textarea name="text" defaultValue={footer.text} rows={2} maxLength={200} />
            </Field>
            <Field label="Copyright line">
              <Input name="copyright" defaultValue={footer.copyright} maxLength={160} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Privacy policy link">
                <Input name="privacyLink" defaultValue={footer.privacyLink} />
              </Field>
              <Field label="Terms link">
                <Input name="termsLink" defaultValue={footer.termsLink} />
              </Field>
              <Field label="About link" hint="Hidden from the footer until set — no /about page exists yet.">
                <Input name="aboutLink" defaultValue={footer.aboutLink} />
              </Field>
              <Field label="Contact link" hint="Defaults to a mailto: link using the General tab's support email if left blank.">
                <Input name="contactLink" defaultValue={footer.contactLink} />
              </Field>
            </div>
          </SettingsSectionForm>
        </TabsContent>

        {/* ---------- SEO ---------- */}
        <TabsContent value="seo">
          <SettingsSectionForm action={saveSeoSettingsAction}>
            <Field label="Default meta title">
              <Input name="metaTitle" defaultValue={seo.metaTitle} required maxLength={70} />
            </Field>
            <Field label="Meta description">
              <Textarea name="metaDescription" defaultValue={seo.metaDescription} rows={3} maxLength={300} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaField label="Open Graph image" name="ogImage" currentUrl={seo.ogImage} />
              <MediaField label="Twitter card image" name="twitterImage" currentUrl={seo.twitterImage} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Robots" hint={'e.g. "index, follow" or "noindex, nofollow". "noindex" here also blocks the whole site in robots.txt.'}>
                <Input name="robots" defaultValue={seo.robots} placeholder="index, follow" />
              </Field>
              <Field label="Canonical URL" hint="Overrides the site's base URL that page canonicals resolve against. Leave blank to use the deployment URL.">
                <Input name="canonicalUrl" type="url" defaultValue={seo.canonicalUrl} placeholder="https://seedhideal.com" />
              </Field>
            </div>
          </SettingsSectionForm>
        </TabsContent>

        {/* ---------- MEDIA ---------- */}
        <TabsContent value="media">
          <SettingsSectionForm action={saveMediaSettingsAction}>
            <MediaField label="Logo" name="logo" hint="Replaces the coded wordmark in the header and footer." currentUrl={media.logo} />
            <MediaField
              label="Dark logo"
              name="darkLogo"
              hint="Stored for a future dark-background surface — the site has no dark theme yet, so this isn't displayed anywhere today."
              currentUrl={media.darkLogo}
            />
            <MediaField label="Favicon" name="favicon" hint="Replaces the default browser tab icon." currentUrl={media.favicon} />
            <MediaField
              label="Default vehicle placeholder"
              name="vehiclePlaceholder"
              hint="Stored for future use — listings with no photos currently show a styled placeholder block, not an uploaded image."
              currentUrl={media.vehiclePlaceholder}
            />
            <MediaField
              label="Default user avatar"
              name="userAvatarPlaceholder"
              hint="Stored for future use — users with no avatar currently show an initial-letter badge, not an uploaded image."
              currentUrl={media.userAvatarPlaceholder}
            />
          </SettingsSectionForm>
        </TabsContent>

        {/* ---------- EMAIL ---------- */}
        <TabsContent value="email">
          <div className="space-y-3">
            <Card className="space-y-3 p-4">
              <Row label="Provider" value={email.provider} on={email.configured} />
              <Row label="Sender name" value={email.senderName} />
              <Row label="Sender email" value={email.senderEmail} />
            </Card>
            <p className="text-[13px] text-muted">
              Sends a real email through the exact same delivery path as every transactional email (OTP codes, moderation
              notices) to your own account&apos;s address.
            </p>
            <TestEmailButton />
          </div>
        </TabsContent>

        {/* ---------- SYSTEM ---------- */}
        <TabsContent value="system">
          <div className="space-y-3">
            {system.rows.map((r) => (
              <Card key={r.label} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-[13px] font-semibold">{r.label}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{r.detail}</p>
                </div>
                <Badge tone={r.on ? "verified" : "review"} className="shrink-0">
                  {r.on ? "Operational" : "Needs attention"}
                </Badge>
              </Card>
            ))}
            <Card className="space-y-3 p-4">
              <Row label="Build version" value={system.info.version} />
              <Row label="Build ref" value={system.info.buildRef} />
              <Row label="Environment" value={system.info.environment} />
            </Card>
          </div>
        </TabsContent>

        {/* ---------- MAINTENANCE ---------- */}
        <TabsContent value="maintenance">
          <SettingsSectionForm
            action={saveMaintenanceSettingsAction}
            confirmDescription={
              "Turning maintenance mode ON immediately blocks every visitor except signed-in staff, showing your maintenance message instead of the site. Turning it OFF immediately restores normal access."
            }
          >
            <label className="flex items-center gap-2.5 text-[13px] font-semibold">
              <input type="checkbox" name="enabled" defaultChecked={maintenance.enabled} className="h-4 w-4 rounded border-border-input accent-[var(--color-brand)]" />
              Maintenance mode is {maintenance.enabled ? "ON" : "off"}
            </label>
            <Field label="Maintenance message" hint="Shown to visitors instead of the site while maintenance mode is on. Staff can still browse normally.">
              <Textarea name="message" defaultValue={maintenance.message} rows={3} maxLength={300} />
            </Field>
          </SettingsSectionForm>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value, on }: { label: string; value: string; on?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] font-semibold">{label}</p>
      <p className="flex items-center gap-2 text-[13px] text-muted">
        {value}
        {on !== undefined && <Badge tone={on ? "verified" : "review"}>{on ? "Configured" : "Needs attention"}</Badge>}
      </p>
    </div>
  );
}
