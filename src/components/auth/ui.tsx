"use client";

import { type ComponentProps, type ReactNode, useId, useState } from "react";
import Link from "next/link";
import { EyeIcon, EyeOffIcon } from "./icons";

// Self-contained styling for the (auth) route group, deliberately not reusing
// src/components/ui.tsx — that library's variants are hardcoded to the site's
// forest-green brand used everywhere else. These match the navy/teal reference
// design (src/design-reference/auth-screens.png) and stay scoped to /welcome,
// /sign-in, /sign-up, /verify, etc.

export function AuthCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7 ${className}`}>
      {children}
    </div>
  );
}

export function AuthWordmark() {
  return (
    <div className="mb-6 text-center">
      <p className="font-[family-name:var(--font-poppins)] text-xl font-bold text-[#0F172A]">SeedhiDeal</p>
    </div>
  );
}

export function AuthHeading({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-semibold text-[#0F172A]">{children}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function AuthBackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#0F172A] hover:bg-slate-100"
      aria-label="Back"
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <path d="M12.5 15 7.5 10l5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

type ButtonVariant = "primary" | "teal" | "secondary";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-[#0F172A] text-white hover:bg-[#1E293B] disabled:bg-slate-300",
  teal: "bg-[#14BBA4] text-white hover:bg-[#109c88] disabled:bg-slate-300",
  secondary: "bg-white text-[#0F172A] border border-slate-200 hover:bg-slate-50",
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
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function AuthDivider({ label = "OR" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export function AuthErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

export function AuthFooterLink({ prompt, label, href }: { prompt: string; label: string; href: string }) {
  return (
    <p className="mt-6 text-center text-sm text-slate-500">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-[#14BBA4] hover:text-[#109c88]">
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
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[#0F172A]">
        {label}
      </label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input
          id={inputId}
          {...props}
          className={`w-full rounded-xl border border-slate-200 bg-white py-3 text-[15px] text-[#0F172A] placeholder:text-slate-400 focus:border-[#14BBA4] focus:outline-none focus:ring-2 focus:ring-[#14BBA4]/30 ${icon ? "pl-10 pr-3.5" : "px-3.5"} ${className}`}
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
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[#0F172A]">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
            <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          {...props}
          className={`w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-[15px] text-[#0F172A] placeholder:text-slate-400 focus:border-[#14BBA4] focus:outline-none focus:ring-2 focus:ring-[#14BBA4]/30 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
    <label className="flex items-start gap-2.5 text-sm text-slate-600">
      <input
        type="checkbox"
        name={name}
        required={required}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#14BBA4] focus:ring-[#14BBA4]/40"
      />
      <span>{children}</span>
    </label>
  );
}

export function AuthSelect({ label, id, className = "", children, ...props }: ComponentProps<"select"> & { label: string }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-[#0F172A]">
        {label}
      </label>
      <select
        id={selectId}
        {...props}
        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-[#0F172A] focus:border-[#14BBA4] focus:outline-none focus:ring-2 focus:ring-[#14BBA4]/30 ${className}`}
      >
        {children}
      </select>
    </div>
  );
}
