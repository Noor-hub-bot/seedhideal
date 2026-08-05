// Small icon set for the AI Assistant widget — same hand-drawn, stroke-based style as
// src/components/home/icons.tsx, kept local since these are specific to this feature.

type IconProps = { className?: string };

export function ChatBubbleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 5.5h16v11H9.5L5.5 20v-3.5H4v-11Z" />
      <path d="M8 10h8M8 13h5" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className} aria-hidden>
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M17 3 3 9.5l6 2.2M17 3l-2.2 12L8.5 11.7M17 3l-8.5 8.7" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M10 1.5 11.3 7 17 8.3 11.3 9.6 10 15.2 8.7 9.6 3 8.3 8.7 7 10 1.5Z" />
    </svg>
  );
}
