"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestOtpAction,
  verifyOtpAction,
  type AuthFormState,
} from "@/lib/actions/auth";
import { Button, Card, Input, Label } from "@/components/ui";

const initialState: AuthFormState = { step: "phone" };

export function SignInForm() {
  const [state, formAction, pending] = useActionState(
    async (prev: AuthFormState, formData: FormData) => {
      return prev.step === "phone"
        ? requestOtpAction(prev, formData)
        : verifyOtpAction(prev, formData);
    },
    initialState,
  );

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        {state.step === "phone" ? (
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="0300 1234567"
              autoComplete="tel"
              required
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="code">6-digit code sent to {state.phone}</Label>
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </div>
        )}

        {state.step === "code" && state.needsTerms && (
          <label className="flex items-start gap-2 text-sm text-body-soft">
            <input type="checkbox" name="acceptTerms" required className="mt-0.5" />
            <span>
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="font-semibold text-brand hover:text-brand-strong"
              >
                Terms of Service
              </Link>
            </span>
          </label>
        )}

        {state.error && (
          <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? "Please wait…"
            : state.step === "phone"
              ? "Send code"
              : "Verify and sign in"}
        </Button>
      </form>
    </Card>
  );
}
