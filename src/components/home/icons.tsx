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
