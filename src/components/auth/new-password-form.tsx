"use client";

import { useActionState, useState } from "react";
import { resetPasswordNewAction, type AuthActionState } from "@/lib/actions/auth";
import { AuthButton, AuthErrorText, AuthPasswordInput } from "./ui";
import { CheckCircleIcon } from "./icons";

const RULES: { test: (p: string) => boolean; label: string }[] = [
  { test: (p) => p.length >= 8, label: "At least 8 characters" },
  { test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p), label: "Include uppercase & lowercase" },
  { test: (p) => /[0-9]/.test(p), label: "Include a number" },
];

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(resetPasswordNewAction, {});
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-6">
      <AuthPasswordInput
        label="New Password"
        name="password"
        placeholder="Enter new password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <AuthPasswordInput
        label="Confirm Password"
        name="confirmPassword"
        placeholder="Confirm new password"
        autoComplete="new-password"
        required
      />

      <ul className="space-y-2 rounded-[16px] bg-[#F8FAFC] p-4">
        {RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-2 text-sm transition-colors ${met ? "text-[#0F766E]" : "text-[#9CA3AF]"}`}
            >
              <CheckCircleIcon className={`h-4 w-4 shrink-0 ${met ? "sd-anim-pop" : ""}`} />
              {rule.label}
            </li>
          );
        })}
      </ul>

      <AuthErrorText>{state.error}</AuthErrorText>

      <AuthButton type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update Password"}
      </AuthButton>
    </form>
  );
}
