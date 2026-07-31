"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signInWithGoogleAction, type AuthActionState } from "@/lib/actions/auth";
import { AuthButton, AuthDivider, AuthErrorText, AuthInput, AuthPasswordInput } from "./ui";
import { GoogleIcon, MailIcon } from "./icons";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(signInAction, {});

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        {next && <input type="hidden" name="next" value={next} />}
        <AuthInput
          label="Email Address"
          name="email"
          type="email"
          placeholder="Enter your email"
          icon={<MailIcon className="h-[18px] w-[18px]" />}
          autoComplete="email"
          required
        />
        <div>
          <AuthPasswordInput
            label="Password"
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-sm font-semibold text-[#0F766E] hover:text-[#0D9488]">
              Forgot Password?
            </Link>
          </div>
        </div>

        <AuthErrorText>{state.error}</AuthErrorText>

        <AuthButton type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign In"}
        </AuthButton>
      </form>

      {/* Google sits below the primary Sign In action, never beside/above it. */}
      <AuthDivider />

      <form action={signInWithGoogleAction}>
        <AuthButton type="submit" variant="secondary">
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </AuthButton>
      </form>

      <p className="mt-2 text-center text-[15px] text-[#6B7280]">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-semibold text-[#0F766E] hover:text-[#0D9488]">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
