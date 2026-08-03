// Homepage icon set. Replaces plain Unicode glyphs (✓, ★, ＋) previously used
// as icons in Badge/accordion content — those depend on the visitor's font
// for rendering and can't be styled (stroke width, precise sizing) the way a
// real icon can. Style matches the existing homepage icon language (stroke-
// based, rounded caps/joins) already used by BodyTypeIcon in body-type-grid.tsx.

type IconProps = { className?: string };

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M10 1.6l2.5 5.4 5.9.6-4.4 4 1.3 5.8L10 14.6l-5.3 2.8 1.3-5.8-4.4-4 5.9-.6L10 1.6Z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Why SeedhiDeal pillar icons ----------

export function TrustIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 8.5 12 4l10 4.5v5.7c0 4.4-3.3 7.6-10 9.8-6.7-2.2-10-5.4-10-9.8V8.5Z" />
      <path d="m8.5 12.3 2.5 2.5 4.5-4.6" />
    </svg>
  );
}

export function VerificationIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12.5h3M8 8.5h8M8 16.5h5" />
      <circle cx="16.5" cy="16" r="3.5" fill="currentColor" stroke="none" />
      <path d="m15 16 1.1 1.1L18 15" stroke="white" strokeWidth="1.3" />
    </svg>
  );
}

export function SecureBuyingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
      <path d="M12 14.5v2.2" />
    </svg>
  );
}

export function FastSearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
      <path d="M8.2 10.5h4.6M10.5 8.2v4.6" />
    </svg>
  );
}

export function EasySellingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.5 3.5 20 11l-8.5 8.5a1.5 1.5 0 0 1-2.1 0L4 14.1a1.5 1.5 0 0 1 0-2.1L12.5 3.5Z" />
      <path d="M12.5 3.5H18a2 2 0 0 1 2 2v5.5" />
      <circle cx="14.75" cy="8.25" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ---------- Statistics band icons ----------

export function CarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 16v-3.2a2 2 0 0 1 .3-1L6 8.3A2 2 0 0 1 7.8 7h8.4a2 2 0 0 1 1.8 1.3l1.7 3.5a2 2 0 0 1 .3 1V16" />
      <path d="M4 16h16v2a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-9v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2Z" />
      <circle cx="7.5" cy="16" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.8a3 3 0 0 1 0 5.8" />
      <path d="M15.5 14.2a5.5 5.5 0 0 1 5 5.3" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

// ---------- Trust comparison (problem/solution) icons ----------

export function IncognitoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3.5 15.5c1.4-5.3 5-8 8.5-8s7.1 2.7 8.5 8" />
      <circle cx="7.5" cy="15.5" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
      <path d="M10 15h4" />
    </svg>
  );
}

export function SpamIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
      <path d="M17.5 2.5v3M16 4h3" stroke="currentColor" />
    </svg>
  );
}

export function PriceTagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11.5 3.5H19a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-.44 1.06l-8 8a1.5 1.5 0 0 1-2.12 0l-6.5-6.5a1.5 1.5 0 0 1 0-2.12l8-8a1.5 1.5 0 0 1 1.06-.44Z" />
      <circle cx="15.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M10.3 13.7v.01M10.3 10.3a1 1 0 1 1 1.4 1.4c-.6.6-1.4 1-1.4 2" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20V10M9.5 20V4M15 20v-7M20.5 20V8" />
      <path d="M3 20h18" />
    </svg>
  );
}

// ---------- How it works icons ----------

export function ClipboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 5.5h16v10.5a1.5 1.5 0 0 1-1.5 1.5H9l-5 4V5.5Z" />
      <path d="M8 9.5h8M8 12.8h5" />
    </svg>
  );
}

export function HandshakeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m2.5 12 4-3.5 3 2 3.2-2.8a2 2 0 0 1 2.7.05L19 11.3" />
      <path d="M6.5 8.5 3 12l4 4 1.3-1.2" />
      <path d="m9.5 10.5 3 3a1.3 1.3 0 0 0 1.9-1.7" />
      <path d="m12.5 13.5 1 1a1.3 1.3 0 0 0 1.9-1.7" />
      <path d="M17.5 8.5 21 12l-4 4-2.2-2" />
    </svg>
  );
}
