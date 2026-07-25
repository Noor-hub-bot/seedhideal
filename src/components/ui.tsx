import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Primitives styled per SeedhiDeal Design System v1.0.
// Buttons: Inter 15/600, 13×24 padding, 10px radius.
// Badges: pills, 6×12 padding, 13/600.
// Cards: white surface, 1px border, 16px radius.

type ButtonVariant = "primary" | "secondary" | "tertiary" | "gold" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-strong disabled:bg-neutral-chip disabled:text-muted disabled:cursor-not-allowed",
  secondary:
    "bg-surface text-foreground border border-border-input hover:bg-background disabled:text-muted",
  tertiary: "bg-transparent text-brand hover:text-brand-strong",
  // Gold button only on forest/dark backgrounds (verification-adjacent CTA per V1 design)
  gold: "bg-gold text-gold-deep hover:opacity-90",
  danger: "bg-alert text-white hover:opacity-90",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-control px-6 py-[13px] text-[15px] font-semibold transition-colors";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`${buttonBase} ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      className={`${buttonBase} ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-card border border-border bg-surface ${className}`}
      {...props}
    />
  );
}

// Badge tones from the design system's badge set:
// verified (forest soft), gold (ownership evidence ONLY), neutral (e.g. Dealer),
// review ("Under review" — alert soft), brand (solid forest)
type BadgeTone = "verified" | "gold" | "neutral" | "review" | "brand";

const badgeTones: Record<BadgeTone, string> = {
  verified: "bg-brand-soft text-brand-soft-ink",
  gold: "bg-gold-soft text-gold-ink",
  neutral: "bg-neutral-chip text-muted",
  review: "bg-alert-soft text-alert-ink",
  brand: "bg-brand text-white",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const inputBase =
  "w-full rounded-input border border-border-input bg-surface px-4 py-3 text-[15px] text-foreground placeholder:text-muted focus:border-brand focus:outline-2 focus:outline-brand/25";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputBase} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`rounded-input border border-border-input bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-brand focus:outline-2 focus:outline-brand/25 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${inputBase} ${className}`} {...props} />;
}

export function Label({ className = "", ...props }: ComponentProps<"label">) {
  return (
    <label
      className={`mb-1.5 block text-sm font-medium text-foreground ${className}`}
      {...props}
    />
  );
}

/** Section heading in the editorial serif voice (Newsreader Medium). */
export function Heading({
  as: Tag = "h1",
  size = "lg",
  className = "",
  children,
}: {
  as?: "h1" | "h2" | "h3";
  size?: "display" | "lg" | "md";
  className?: string;
  children: ReactNode;
}) {
  const sizes = {
    display: "text-[44px] leading-[1.08] sm:text-[60px] tracking-[-0.01em]",
    lg: "text-[32px] leading-tight sm:text-[34px]",
    md: "text-[24px] leading-tight sm:text-[28px]",
  } as const;
  return (
    <Tag className={`font-display font-medium ${sizes[size]} ${className}`}>
      {children}
    </Tag>
  );
}

/** Scam-safety warning shown before contact/visit actions (DET-06, INQ-07).
    Calm, factual tone per brand principles — informative, not alarmist. */
export function SafetyNotice() {
  return (
    <div
      role="note"
      className="rounded-card border border-border bg-surface p-4 text-sm leading-relaxed text-body-soft"
    >
      <span className="font-semibold text-alert-ink">Stay safe: </span>
      never send an advance payment or share OTP codes. Meet in a public place
      and inspect the car and documents in person before paying anything.
    </div>
  );
}
