"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, signInWithGoogleAction, type AuthActionState } from "@/lib/actions/auth";
import { AuthButton, AuthCheckbox, AuthDivider, AuthErrorText, AuthInput, AuthPasswordInput } from "./ui";
import { GoogleIcon, MailIcon, UserIcon } from "./icons";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(signUpAction, {});

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        <AuthInput
          label="Full Name"
          name="fullName"
          placeholder="Enter your full name"
          icon={<UserIcon className="h-[18px] w-[18px]" />}
          autoComplete="name"
          required
        />
        <AuthInput
          label="Email Address"
          name="email"
          type="email"
          placeholder="Enter your email"
          icon={<MailIcon className="h-[18px] w-[18px]" />}
          autoComplete="email"
          required
        />
        <AuthPasswordInput
          label="Password"
          name="password"
          placeholder="Create a password"
          autoComplete="new-password"
          required
        />
        <AuthPasswordInput
          label="Confirm Password"
          name="confirmPassword"
          placeholder="Confirm your password"
          autoComplete="new-password"
          required
        />

        <AuthCheckbox name="acceptTerms" required>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-[#0F172A] hover:text-[#0F766E]">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-[#0F172A] hover:text-[#0F766E]">
            Privacy Policy
          </Link>
        </AuthCheckbox>

        <AuthErrorText>{state.error}</AuthErrorText>

        <AuthButton type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Create Account"}
        </AuthButton>
      </form>

      {/* Google sits below the primary Create Account action, never beside/above it. */}
      <AuthDivider />

      <form action={signInWithGoogleAction}>
        <AuthButton type="submit" variant="secondary">
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </AuthButton>
      </form>

      <p className="mt-2 text-center text-[15px] text-[#6B7280]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-[#0F766E] hover:text-[#0D9488]">
          Sign In
        </Link>
      </p>
    </div>
  );
}
