"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type AuthActionState } from "@/lib/actions/auth";
import { AuthButton, AuthErrorText, AuthInput } from "./ui";
import { MailIcon } from "./icons";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(forgotPasswordAction, {});

  return (
    <form action={formAction} className="space-y-5">
      <AuthInput
        label="Email Address"
        name="email"
        type="email"
        placeholder="Enter your email"
        icon={<MailIcon className="h-[18px] w-[18px]" />}
        autoComplete="email"
        required
      />
      <AuthErrorText>{state.error}</AuthErrorText>
      <AuthButton type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send Reset Code"}
      </AuthButton>
    </form>
  );
}
