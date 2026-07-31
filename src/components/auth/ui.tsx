"use client";

import { type ComponentProps, type ReactNode, useId, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, EyeIcon, EyeOffIcon } from "./icons";

// ---------------------------------------------------------------------------
// SeedhiDeal Auth UI — Material Design 3 inspired, mobile-first design system
// for the (auth) route group only. Deliberately not reusing src/components/ui.tsx
// (that library is hardcoded to the site's forest-green brand used everywhere
// else). Palette, radii and spacing below are the single source of truth for
// every auth screen — never hard-code a color/radius/shadow in a page.
//
// Palette   Primary #0F172A · Accent #14B8A6 (text/icons use the darker
//           #0F766E "accent-ink" derivative so every accent-colored label
//           clears WCAG AA 4.5:1 on white/#F8FAFC — raw #14B8A6 on white is
//           only ~2.5:1) · Background #F8FAFC · Surface #FFFFFF ·
//           Border #E5E7EB · Text #111827.
// Radius    16px on every card/button/field ("rounded-[16px]"); full-round
//           for icon badges and the circular back button.
// Spacing   8px grid throughout (gap/padding/margin values are all multiples
//           of 8 — no more 1.5/2.5/3.5 fractional Tailwind steps).
// Motion    sd-anim-* utility classes, defined once in (auth)/layout.tsx and
//           disabled under prefers-reduced-motion.
// ---------------------------------------------------------------------------

const CARD_SHADOW = "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-20px_rgba(15,23,42,0.16)]";
const FIELD_FOCUS =
  "focus:border-[#0F766E] focus:outline-none focus:ring-4 focus:ring-[#14B8A6]/18";

export function AuthCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`sd-anim-fade-up w-full max-w-sm rounded-[16px] border border-[#E5E7EB] bg-white p-6 sm:p-8 ${CARD_SHADOW} ${className}`}
    >
      {children}
    </div>
  );
}

export function AuthWordmark() {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      <span className="h-2 w-2 rounded-full bg-[#14B8A6]" />
      <p className="font-[family-name:var(--font-poppins)] text-xl font-bold tracking-[-0.01em] text-[#0F172A]">
        SeedhiDeal
      </p>
    </div>
  );
}

export function AuthHeading({
  children,
  subtitle,
  center = false,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`mb-8 ${center ? "text-center" : ""}`}>
      <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-semibold tracking-[-0.01em] text-[#0F172A]">
        {children}
      </h1>
      {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-[#6B7280]">{subtitle}</p>}
    </div>
  );
}

export function AuthBackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-[#F8FAFC] active:bg-[#E5E7EB]/60"
      aria-label="Back"
    >
      <ChevronLeftIcon className="h-5 w-5" />
    </Link>
  );
}

// "teal" is kept as an alias of "accent" purely so pages outside this redesign's
// scope (e.g. /account-created) keep compiling unchanged — both now resolve to
// the AA-safe accent-ink fill rather than the raw #14B8A6 accent.
type ButtonVariant = "primary" | "secondary" | "accent" | "teal";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-[#0F172A] text-white hover:bg-[#1E293B] active:bg-[#1E293B] disabled:bg-[#CBD5E1]",
  secondary:
    "bg-white text-[#111827] border border-[#E5E7EB] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] disabled:text-[#9CA3AF]",
  accent: "bg-[#0F766E] text-white hover:bg-[#0D9488] active:bg-[#0D9488] disabled:bg-[#CBD5E1]",
  teal: "bg-[#0F766E] text-white hover:bg-[#0D9488] active:bg-[#0D9488] disabled:bg-[#CBD5E1]",
};

export function AuthButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-[16px] px-6 text-[15px] font-semibold tracking-[-0.01em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#14B8A6]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_24px_-10px_rgba(15,23,42,0.28)] disabled:shadow-none ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function AuthDivider({ label = "OR" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="h-px flex-1 bg-[#E5E7EB]" />
      <span className="text-xs font-semibold tracking-[0.08em] text-[#9CA3AF]">{label}</span>
      <div className="h-px flex-1 bg-[#E5E7EB]" />
    </div>
  );
}

export function AuthErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="sd-anim-fade-up rounded-[14px] border-l-4 border-red-400 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700"
    >
      {children}
    </p>
  );
}

export function AuthFooterLink({ prompt, label, href }: { prompt: string; label: string; href: string }) {
  return (
    <p className="mt-8 text-center text-[15px] text-[#6B7280]">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-[#0F766E] hover:text-[#0D9488]">
        {label}
      </Link>
    </p>
  );
}

type FieldProps = ComponentProps<"input"> & {
  label: string;
  icon?: ReactNode;
};

export function AuthInput({ label, icon, id, className = "", ...props }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-[#111827]">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">{icon}</span>
        )}
        <input
          id={inputId}
          {...props}
          className={`h-14 w-full rounded-[16px] border border-[#E5E7EB] bg-white text-[15px] text-[#111827] placeholder:text-[#9CA3AF] transition-colors ${FIELD_FOCUS} ${icon ? "pl-11 pr-4" : "px-4"} ${className}`}
        />
      </div>
    </div>
  );
}

export function AuthPasswordInput({ label, id, className = "", ...props }: Omit<FieldProps, "icon" | "type">) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-[#111827]">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
          <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
            <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          {...props}
          className={`h-14 w-full rounded-[16px] border border-[#E5E7EB] bg-white pl-11 pr-12 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] transition-colors ${FIELD_FOCUS} ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F8FAFC] hover:text-[#6B7280]"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );
}

export function AuthCheckbox({
  name,
  children,
  required,
}: {
  name: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-relaxed text-[#6B7280]">
      <input
        type="checkbox"
        name={name}
        required={required}
        className="mt-0.5 h-5 w-5 shrink-0 rounded-[6px] border-[#E5E7EB] text-[#0F766E] focus:ring-4 focus:ring-[#14B8A6]/25"
      />
      <span>{children}</span>
    </label>
  );
}

export function AuthSelect({
  label,
  id,
  className = "",
  children,
  ...props
}: ComponentProps<"select"> & { label: string }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div>
      <label htmlFor={selectId} className="mb-2 block text-sm font-medium text-[#111827]">
        {label}
      </label>
      <select
        id={selectId}
        {...props}
        className={`h-14 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-[15px] text-[#111827] transition-colors ${FIELD_FOCUS} ${className}`}
      >
        {children}
      </select>
    </div>
  );
}

// Circular icon badge used to top every informational/confirmation screen
// (Verify Email, Forgot Password, Reset Password, Password Updated, Welcome,
// Splash). Centralizing this stops each page hand-rolling its own inline SVG
// wrapper with a slightly different size/tint every time.
type IconBadgeTone = "accent" | "success" | "primary";

const iconBadgeTones: Record<IconBadgeTone, string> = {
  accent: "bg-[#14B8A6]/12 text-[#0F766E] sd-anim-pulse",
  success: "bg-[#0F766E] text-white sd-anim-pop",
  primary: "bg-[#0F172A]/8 text-[#0F172A]",
};

export function AuthIconBadge({
  children,
  tone = "accent",
  size = 80,
  className = "",
}: {
  children: ReactNode;
  tone?: IconBadgeTone;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative mx-auto mb-6 flex items-center justify-center rounded-full ${iconBadgeTones[tone]} ${className}`}
      style={{ height: size, width: size }}
    >
      {children}
    </div>
  );
}
