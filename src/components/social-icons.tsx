// Minimal monochrome glyphs for the footer's social-links row (Website Settings >
// Contact & Social) — simplified single-path marks rather than each platform's exact
// trademarked logo artwork, in the same `fill="currentColor"` style as this project's
// other small inline icons (src/components/home/icons.tsx).

type IconProps = { className?: string };

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14 22v-8h2.7l.4-3.1H14V9c0-.9.3-1.5 1.6-1.5H17V4.7C16.7 4.7 15.7 4.6 14.7 4.6c-2.2 0-3.7 1.3-3.7 3.8v2.5H8.3V14H11v8h3Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className={className} aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="2.5" y="6" width="19" height="12" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" />
    </svg>
  );
}

export function TiktokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16 3c.4 2.3 1.9 3.7 4 3.9v3c-1.5 0-2.9-.4-4-1.3v6c0 3.3-2.4 5.4-5.3 5.4-3 0-5.3-2.2-5.3-5.2 0-3.1 2.6-5.3 5.6-5.1v3.1c-1.3-.2-2.6.6-2.6 2 0 1.2 1.1 2.1 2.3 2.1 1.4 0 2.5-1.1 2.5-2.8V3h2.8Z" />
    </svg>
  );
}

export function LinkedinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="7.2" cy="8" r="1.3" />
      <path d="M6 10.7h2.4V18H6zM10.5 10.7h2.3v1c.5-.7 1.3-1.2 2.4-1.2 2 0 2.8 1.3 2.8 3.3V18h-2.4v-3.7c0-1-.4-1.6-1.3-1.6-.9 0-1.5.6-1.5 1.6V18h-2.3v-7.3Z" />
    </svg>
  );
}

export function TwitterXIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4 4l7 8.4L4.3 20h2.2l5.8-6.3L16.8 20H20l-7.4-8.9L19.7 4h-2.2l-5.3 5.8L8.2 4H4Z" />
    </svg>
  );
}

export function WhatsappIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.3A9 9 0 1 0 12 3Zm0 1.9a7.1 7.1 0 0 1 6 10.9l-.3.5.4 2.3-2.4-.6-.5.3A7.1 7.1 0 1 1 12 4.9Z" />
      <path d="M9.2 8.3c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.5l-.5.6c-.1.2-.2.3 0 .6.2.3.9 1.3 1.9 2 1.2.9 1.6.8 1.8.7l.7-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.3.3.3.5-.1.6-.4 1.2-.9 1.5-.6.4-1.3.6-2 .4-1.3-.3-2.9-1.1-4.2-2.4-1.3-1.3-2.1-2.8-2.4-4.1-.2-.7 0-1.4.4-2Z" />
    </svg>
  );
}
