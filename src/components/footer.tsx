import Link from "next/link";
import { FooterLogo } from "@/components/logo";
import { getSiteSettings } from "@/lib/site-settings";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TiktokIcon,
  TwitterXIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@/components/social-icons";

const BROWSE_ACCOUNT_SUPPORT_COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Browse",
    links: [
      { label: "All cars", href: "/cars" },
      { label: "Sell your car", href: "/sell" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Saved cars", href: "/dashboard/favorites" },
      { label: "Sign in", href: "/sign-in" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help centre", href: "/help" },
      { label: "Write a review", href: "/reviews/new" },
    ],
  },
];

const SOCIAL_ICONS = [
  { key: "facebook", Icon: FacebookIcon, label: "Facebook" },
  { key: "instagram", Icon: InstagramIcon, label: "Instagram" },
  { key: "youtube", Icon: YoutubeIcon, label: "YouTube" },
  { key: "tiktok", Icon: TiktokIcon, label: "TikTok" },
  { key: "linkedin", Icon: LinkedinIcon, label: "LinkedIn" },
  { key: "twitter", Icon: TwitterXIcon, label: "X (Twitter)" },
  { key: "whatsapp", Icon: WhatsappIcon, label: "WhatsApp" },
] as const;

export async function Footer() {
  const { general, social, footer, media } = await getSiteSettings();

  const legalLinks = [
    { label: "Privacy", href: footer.privacyLink },
    { label: "Terms", href: footer.termsLink },
    ...(footer.aboutLink ? [{ label: "About", href: footer.aboutLink }] : []),
    ...(footer.contactLink
      ? [{ label: "Contact", href: footer.contactLink }]
      : general.supportEmail
        ? [{ label: "Contact", href: `mailto:${general.supportEmail}` }]
        : []),
  ];

  const socialLinks = SOCIAL_ICONS.filter((s) => social[s.key]);
  const contactLines = [general.supportEmail, general.supportPhone, general.whatsappNumber, general.address].filter(Boolean);

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <FooterLogo src={media.logo} siteName={general.siteName} />
            <p className="mt-4 max-w-[220px] text-[13px] leading-relaxed text-muted">
              {footer.text}
            </p>
            {contactLines.length > 0 && (
              <ul className="mt-4 space-y-1 text-[13px] text-muted">
                {general.supportEmail && (
                  <li>
                    <a href={`mailto:${general.supportEmail}`} className="hover:text-foreground">
                      {general.supportEmail}
                    </a>
                  </li>
                )}
                {general.supportPhone && <li>{general.supportPhone}</li>}
                {general.whatsappNumber && (
                  <li>
                    <a
                      href={`https://wa.me/${general.whatsappNumber.replace(/[^0-9]/g, "")}`}
                      className="hover:text-foreground"
                    >
                      WhatsApp: {general.whatsappNumber}
                    </a>
                  </li>
                )}
                {general.address && <li>{general.address}</li>}
              </ul>
            )}
            {social.googleMapsEmbed && (
              <iframe
                src={social.googleMapsEmbed}
                title="Location map"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="mt-4 h-[140px] w-full max-w-[260px] rounded-input border border-border"
              />
            )}
            {socialLinks.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                {socialLinks.map(({ key, Icon, label }) => (
                  <a
                    key={key}
                    href={social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-brand hover:text-brand"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
          {BROWSE_ACCOUNT_SUPPORT_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">
                {col.heading}
              </h3>
              <ul className="space-y-2 text-[13px]">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-muted hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">Legal</h3>
            <ul className="space-y-2 text-[13px]">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-muted hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-12 border-t border-border pt-6 text-[13px] text-muted">{footer.copyright}</p>
      </div>
    </footer>
  );
}
