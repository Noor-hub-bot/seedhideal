// Small inline SVG icons for the auth screens — kept local rather than adding an
// icon library dependency, matching this codebase's minimal-dependency style.

type IconProps = { className?: string };

export function MailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="m3.5 5.5 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="10" cy="6.75" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.75 16.25c0-3.176 2.798-5.5 6.25-5.5s6.25 2.324 6.25 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M5 3.5h2.2l1 3.2-1.6 1.4a9 9 0 0 0 4.3 4.3l1.4-1.6 3.2 1v2.2c0 1-.8 1.8-1.8 1.7A13.5 13.5 0 0 1 3.3 5.3c-.1-1 .7-1.8 1.7-1.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M10 17.5s5.5-4.9 5.5-9.2a5.5 5.5 0 1 0-11 0c0 4.3 5.5 9.2 5.5 9.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="8.3" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M3 7.5C3 6.4 3.9 5.5 5 5.5h1.2l.7-1.3c.2-.4.6-.7 1-.7h4.2c.4 0 .8.3 1 .7l.7 1.3H15c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M2 10s2.8-5 8-5 8 5 8 5-2.8 5-8 5-8-5-8-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M2 10s2.8-5 8-5c1.5 0 2.8.4 3.9 1M18 10s-2.8 5-8 5c-1.5 0-2.8-.4-3.9-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3-4.2 4.2a1 1 0 0 1-1.4 0l-1.8-1.8a1 1 0 1 1 1.4-1.4l1.1 1.1 3.5-3.5a1 1 0 1 1 1.4 1.4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M12.5 15 7.5 10l5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Abstract "verified" mark (rounded shield + check) — the SeedhiDeal auth-flow
// brand mark, shared by the Splash and Welcome screens for a consistent first
// impression independent of the Poppins wordmark.
export function BrandMarkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M24 4 8 10v11c0 10.5 6.8 18.7 16 21 9.2-2.3 16-10.5 16-21V10L24 4Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M24 4 8 10v11c0 10.5 6.8 18.7 16 21 9.2-2.3 16-10.5 16-21V10L24 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M17 24.5 22 29.5 32 18.5" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KeyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="7" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.4 10.6 16 4M14 6l1.8 1.8M11.7 8.3l1.8 1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GoogleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M19.6 10.2c0-.7-.06-1.4-.18-2H10v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H1.1v2.6A10 10 0 0 0 10 20Z"
      />
      <path fill="#FBBC05" d="M4.4 11.9a6 6 0 0 1 0-3.8V5.5H1.1a10 10 0 0 0 0 9l3.3-2.6Z" />
      <path
        fill="#EA4335"
        d="M10 3.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C14.9 1 12.7 0 10 0A10 10 0 0 0 1.1 5.5l3.3 2.6C5.2 5.7 7.4 3.9 10 3.9Z"
      />
    </svg>
  );
}
