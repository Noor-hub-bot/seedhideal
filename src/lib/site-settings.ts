import { cache } from "react";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, siteSettings } from "@/db";

type SiteSettingsRow = typeof siteSettings.$inferSelect;
export type GeneralSettings = SiteSettingsRow["general"];
export type HomepageSettings = SiteSettingsRow["homepage"];
export type HomepageSectionVisibility = HomepageSettings["sections"];
export type SocialSettings = SiteSettingsRow["social"];
export type FooterSettings = SiteSettingsRow["footer"];
export type SeoSettings = SiteSettingsRow["seo"];
export type MediaSettings = SiteSettingsRow["media"];
export type MaintenanceSettings = SiteSettingsRow["maintenance"];

export type SiteSettings = {
  general: GeneralSettings;
  homepage: HomepageSettings;
  social: SocialSettings;
  footer: FooterSettings;
  seo: SeoSettings;
  media: MediaSettings;
  maintenance: MaintenanceSettings;
};

// Every default below matches this project's real, currently-hardcoded copy (layout.tsx's
// SITE_TITLE/SITE_DESCRIPTION, page.tsx's hero copy and stats, footer.tsx's text) — so
// creating the settings row and reading it back changes nothing on the live site until an
// admin actually edits a field. Contact/social fields that have no real hardcoded
// equivalent (support email/phone/WhatsApp, every social link) default to empty and stay
// hidden on the public site until filled in, rather than fabricating placeholder values.
const DEFAULT_GENERAL: GeneralSettings = {
  siteName: "SeedhiDeal",
  description:
    "Trust-first marketplace for verified private-owner cars in Pakistan. Real owners. Real buyers. Seedhi deal.",
  supportEmail: "",
  supportPhone: "",
  whatsappNumber: "",
  address: "",
  timezone: "Asia/Karachi",
  currency: "PKR",
  language: "en",
};

const DEFAULT_HOMEPAGE: HomepageSettings = {
  heroTitle: "Sell with confidence. Buy with proof.",
  heroSubtitle:
    "A trust-first marketplace for verified private-owner cars in Pakistan. Real owners, real buyers, no dealers in disguise — and never a surprise listing charge.",
  heroBackgroundImage: null,
  heroButtonText: "List your car free",
  heroButtonLink: "/sell",
  heroButtonSecondaryText: "Browse verified cars",
  heroButtonSecondaryLink: "/cars",
  stats: [
    { value: "100%", label: "Owner identity verified" },
    { value: "0", label: "Hidden listing charges" },
    { value: "1", label: "Ticket per issue, always tracked" },
  ],
  sections: {
    browseBy: true,
    recentlyAdded: true,
    featuredCars: true,
    verifiedSellers: true,
    socialProof: true,
    statisticsBand: true,
    trustComparison: true,
    howItWorks: true,
    whySeedhiDeal: true,
    downloadApp: true,
    newsletter: true,
    faq: true,
  },
};

const DEFAULT_SOCIAL: SocialSettings = {
  facebook: "",
  instagram: "",
  youtube: "",
  tiktok: "",
  linkedin: "",
  twitter: "",
  whatsapp: "",
  googleMapsEmbed: "",
};

const DEFAULT_FOOTER: FooterSettings = {
  text: "A trust-first marketplace for verified private-owner cars in Pakistan.",
  copyright: "© 2026 SeedhiDeal. Working name — brand and legal checks pending.",
  privacyLink: "/privacy",
  termsLink: "/terms",
  aboutLink: "",
  contactLink: "",
};

const DEFAULT_SEO: SeoSettings = {
  metaTitle: "SeedhiDeal — verified cars from real owners",
  metaDescription:
    "Trust-first marketplace for verified private-owner cars in Pakistan. Real owners. Real buyers. Seedhi deal.",
  ogImage: "/logo.jpg",
  twitterImage: "/logo.jpg",
  robots: "index, follow",
  // Empty on purpose — layout.tsx deliberately sets no global canonical (only individual
  // pages that need one define their own via alternates.canonical); an admin-set value
  // here overrides metadataBase instead, it doesn't invent a canonical where none exists.
  canonicalUrl: "",
};

const DEFAULT_MEDIA: MediaSettings = {
  logo: null,
  darkLogo: null,
  favicon: null,
  vehiclePlaceholder: null,
  userAvatarPlaceholder: null,
};

const DEFAULT_MAINTENANCE: MaintenanceSettings = {
  enabled: false,
  message: "We're performing scheduled maintenance and will be back shortly.",
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  general: DEFAULT_GENERAL,
  homepage: DEFAULT_HOMEPAGE,
  social: DEFAULT_SOCIAL,
  footer: DEFAULT_FOOTER,
  seo: DEFAULT_SEO,
  media: DEFAULT_MEDIA,
  maintenance: DEFAULT_MAINTENANCE,
};

// Deduped per request (via React's cache()), not across requests — settings are read on
// nearly every public page render (layout, header, footer, homepage), so this collapses
// what would otherwise be several identical queries per request down to one, without the
// staleness risk of a cross-request cache: every admin save takes effect on the very next
// request, with no revalidateTag bookkeeping required.
const loadRow = cache(async (): Promise<SiteSettingsRow | null> => {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, "default"));
  return row ?? null;
});

/** Merges the stored row over the real defaults (not the other way around) — if a
 * future settings field is added to the defaults above but an existing stored row
 * predates it, the new field still resolves to its real default rather than
 * `undefined`, with no migration required. */
export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await loadRow();
  return {
    general: { ...DEFAULT_GENERAL, ...row?.general },
    homepage: {
      ...DEFAULT_HOMEPAGE,
      ...row?.homepage,
      sections: { ...DEFAULT_HOMEPAGE.sections, ...row?.homepage?.sections },
    },
    social: { ...DEFAULT_SOCIAL, ...row?.social },
    footer: { ...DEFAULT_FOOTER, ...row?.footer },
    seo: { ...DEFAULT_SEO, ...row?.seo },
    media: { ...DEFAULT_MEDIA, ...row?.media },
    maintenance: { ...DEFAULT_MAINTENANCE, ...row?.maintenance },
  };
}

async function upsertSection(
  staffId: string,
  section: keyof SiteSettings,
  value: SiteSettings[keyof SiteSettings],
): Promise<void> {
  const current = await getSiteSettings();
  await db
    .insert(siteSettings)
    .values({ id: "default", ...current, [section]: value, updatedBy: staffId })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { [section]: value, updatedAt: new Date(), updatedBy: staffId },
    });
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

export async function updateGeneralSettings(staffId: string, value: GeneralSettings): Promise<void> {
  await upsertSection(staffId, "general", value);
}

export async function updateHomepageSettings(staffId: string, value: HomepageSettings): Promise<void> {
  await upsertSection(staffId, "homepage", value);
}

export async function updateSocialSettings(staffId: string, value: SocialSettings): Promise<void> {
  await upsertSection(staffId, "social", value);
}

export async function updateFooterSettings(staffId: string, value: FooterSettings): Promise<void> {
  await upsertSection(staffId, "footer", value);
}

export async function updateSeoSettings(staffId: string, value: SeoSettings): Promise<void> {
  await upsertSection(staffId, "seo", value);
}

export async function updateMediaSettings(staffId: string, value: MediaSettings): Promise<void> {
  await upsertSection(staffId, "media", value);
}

export async function updateMaintenanceSettings(staffId: string, value: MaintenanceSettings): Promise<void> {
  await upsertSection(staffId, "maintenance", value);
}
