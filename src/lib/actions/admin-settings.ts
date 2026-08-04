"use server";

import { requireStaff } from "@/lib/auth";
import {
  getSiteSettings,
  updateFooterSettings,
  updateGeneralSettings,
  updateHomepageSettings,
  updateMaintenanceSettings,
  updateMediaSettings,
  updateSeoSettings,
  updateSocialSettings,
  type FooterSettings,
  type GeneralSettings,
  type HomepageSettings,
  type MaintenanceSettings,
  type MediaSettings,
  type SeoSettings,
  type SocialSettings,
} from "@/lib/site-settings";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, detectFileType, uploadSiteAsset } from "@/lib/storage";
import { sendTestEmail } from "@/lib/email";

export type SettingsActionResult = { ok: true; message: string } | { ok: false; error: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

function optionalUrlError(label: string, value: string): string | null {
  if (value && !URL_RE.test(value)) return `${label} must be a full https:// URL.`;
  return null;
}

export async function saveGeneralSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  const staff = await requireStaff();

  const siteName = str(formData, "siteName");
  if (!siteName) return { ok: false, error: "Website name is required." };

  const supportEmail = str(formData, "supportEmail");
  if (supportEmail && !EMAIL_RE.test(supportEmail)) return { ok: false, error: "Enter a valid support email." };

  const value: GeneralSettings = {
    siteName,
    description: str(formData, "description"),
    supportEmail,
    supportPhone: str(formData, "supportPhone"),
    whatsappNumber: str(formData, "whatsappNumber"),
    address: str(formData, "address"),
    timezone: str(formData, "timezone") || "Asia/Karachi",
    currency: str(formData, "currency") || "PKR",
    language: str(formData, "language") || "en",
  };

  await updateGeneralSettings(staff.id, value);
  return { ok: true, message: "General settings saved." };
}

export async function saveHomepageSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  const staff = await requireStaff();

  const heroTitle = str(formData, "heroTitle");
  if (!heroTitle) return { ok: false, error: "Hero title is required." };
  const heroButtonText = str(formData, "heroButtonText");
  const heroButtonLink = str(formData, "heroButtonLink");
  if (heroButtonText && !heroButtonLink) return { ok: false, error: "Hero button link is required when button text is set." };

  const current = await getSiteSettings();
  const stats = [0, 1, 2].map((i) => ({
    value: str(formData, `statValue${i}`),
    label: str(formData, `statLabel${i}`),
  }));

  const value: HomepageSettings = {
    heroTitle,
    heroSubtitle: str(formData, "heroSubtitle"),
    heroBackgroundImage: current.homepage.heroBackgroundImage,
    heroButtonText,
    heroButtonLink,
    heroButtonSecondaryText: str(formData, "heroButtonSecondaryText"),
    heroButtonSecondaryLink: str(formData, "heroButtonSecondaryLink"),
    stats: stats.filter((s) => s.value || s.label),
    sections: {
      browseBy: bool(formData, "section_browseBy"),
      recentlyAdded: bool(formData, "section_recentlyAdded"),
      featuredCars: bool(formData, "section_featuredCars"),
      verifiedSellers: bool(formData, "section_verifiedSellers"),
      socialProof: bool(formData, "section_socialProof"),
      statisticsBand: bool(formData, "section_statisticsBand"),
      trustComparison: bool(formData, "section_trustComparison"),
      howItWorks: bool(formData, "section_howItWorks"),
      whySeedhiDeal: bool(formData, "section_whySeedhiDeal"),
      downloadApp: bool(formData, "section_downloadApp"),
      newsletter: bool(formData, "section_newsletter"),
      faq: bool(formData, "section_faq"),
    },
  };

  const heroBg = formData.get("heroBackgroundImage");
  if (heroBg instanceof File && heroBg.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.has(heroBg.type) || heroBg.size > MAX_PHOTO_BYTES) {
      return { ok: false, error: "Hero background image must be a JPG, PNG or WEBP under 10MB." };
    }
    if (detectFileType(new Uint8Array(await heroBg.arrayBuffer())) !== heroBg.type) {
      return { ok: false, error: "Hero background image doesn't look like a valid image file." };
    }
    value.heroBackgroundImage = await uploadSiteAsset(heroBg, "hero-background");
  }

  await updateHomepageSettings(staff.id, value);
  return { ok: true, message: "Homepage settings saved." };
}

export async function saveSocialSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  const staff = await requireStaff();

  const value: SocialSettings = {
    facebook: str(formData, "facebook"),
    instagram: str(formData, "instagram"),
    youtube: str(formData, "youtube"),
    tiktok: str(formData, "tiktok"),
    linkedin: str(formData, "linkedin"),
    twitter: str(formData, "twitter"),
    whatsapp: str(formData, "whatsapp"),
    googleMapsEmbed: str(formData, "googleMapsEmbed"),
  };

  for (const [label, key] of [
    ["Facebook", "facebook"],
    ["Instagram", "instagram"],
    ["YouTube", "youtube"],
    ["TikTok", "tiktok"],
    ["LinkedIn", "linkedin"],
    ["X (Twitter)", "twitter"],
    ["Google Maps embed URL", "googleMapsEmbed"],
  ] as const) {
    const err = optionalUrlError(label, value[key]);
    if (err) return { ok: false, error: err };
  }

  await updateSocialSettings(staff.id, value);
  return { ok: true, message: "Contact & social settings saved." };
}

export async function saveFooterSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  const staff = await requireStaff();

  const value: FooterSettings = {
    text: str(formData, "text"),
    copyright: str(formData, "copyright"),
    privacyLink: str(formData, "privacyLink") || "/privacy",
    termsLink: str(formData, "termsLink") || "/terms",
    aboutLink: str(formData, "aboutLink"),
    contactLink: str(formData, "contactLink"),
  };

  await updateFooterSettings(staff.id, value);
  return { ok: true, message: "Footer settings saved." };
}

export async function saveSeoSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  const staff = await requireStaff();
  const current = await getSiteSettings();

  const metaTitle = str(formData, "metaTitle");
  if (!metaTitle) return { ok: false, error: "Default meta title is required." };
  const canonicalUrl = str(formData, "canonicalUrl");
  const canonicalErr = optionalUrlError("Canonical URL", canonicalUrl);
  if (canonicalErr) return { ok: false, error: canonicalErr };

  const value: SeoSettings = {
    metaTitle,
    metaDescription: str(formData, "metaDescription"),
    ogImage: current.seo.ogImage,
    twitterImage: current.seo.twitterImage,
    robots: str(formData, "robots") || "index, follow",
    canonicalUrl,
  };

  for (const [field, kind] of [
    ["ogImage", "og-image"],
    ["twitterImage", "twitter-image"],
  ] as const) {
    const file = formData.get(field);
    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_BYTES) {
        return { ok: false, error: "SEO images must be a JPG, PNG or WEBP under 10MB." };
      }
      if (detectFileType(new Uint8Array(await file.arrayBuffer())) !== file.type) {
        return { ok: false, error: "One of the SEO images doesn't look like a valid image file." };
      }
      value[field] = await uploadSiteAsset(file, kind);
    }
  }

  await updateSeoSettings(staff.id, value);
  return { ok: true, message: "SEO settings saved." };
}

const MEDIA_FIELDS = [
  ["logo", "logo"],
  ["darkLogo", "dark-logo"],
  ["favicon", "favicon"],
  ["vehiclePlaceholder", "vehicle-placeholder"],
  ["userAvatarPlaceholder", "user-avatar-placeholder"],
] as const;

export async function saveMediaSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  const staff = await requireStaff();
  const current = await getSiteSettings();
  const value: MediaSettings = { ...current.media };

  for (const [field, kind] of MEDIA_FIELDS) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!ALLOWED_PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_BYTES) {
      return { ok: false, error: "Each media file must be a JPG, PNG or WEBP under 10MB." };
    }
    if (detectFileType(new Uint8Array(await file.arrayBuffer())) !== file.type) {
      return { ok: false, error: "One of the uploaded files doesn't look like a valid image." };
    }
    value[field] = await uploadSiteAsset(file, kind);
  }

  await updateMediaSettings(staff.id, value);
  return { ok: true, message: "Media settings saved." };
}

export async function saveMaintenanceSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  const staff = await requireStaff();

  const value: MaintenanceSettings = {
    enabled: bool(formData, "enabled"),
    message: str(formData, "message") || "We're performing scheduled maintenance and will be back shortly.",
  };

  await updateMaintenanceSettings(staff.id, value);
  return { ok: true, message: value.enabled ? "Maintenance mode is now ON." : "Maintenance mode is now off." };
}

export async function sendTestEmailAction(): Promise<SettingsActionResult> {
  const staff = await requireStaff();
  if (!staff.email) return { ok: false, error: "Your admin account has no email address to send a test to." };
  try {
    await sendTestEmail(staff.email);
    return { ok: true, message: `Test email sent to ${staff.email}.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send test email." };
  }
}

