"use client";

import { useActionState, useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { resendOtpAction, type AuthActionState, type OtpActionState } from "@/lib/actions/auth";
import { AuthButton, AuthErrorText } from "./ui";

const RESEND_SECONDS = 60;
const DIGITS = 6;

export function OtpForm({
  email,
  purpose,
  verifyAction,
}: {
  email: string;
  purpose: "verify_email" | "reset_password";
  verifyAction: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
}) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(verifyAction, {});
  const [resendState, resendAction, resendPending] = useActionState<OtpActionState, FormData>(resendOtpAction, {});
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(""));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Adjusting state during render (React's recommended alternative to an effect
  // here) rather than setState-in-effect, which would trigger a cascading render.
  const [trackedResendState, setTrackedResendState] = useState(resendState);
  if (resendState !== trackedResendState) {
    setTrackedResendState(resendState);
    if (resendState.sent) setSeconds(RESEND_SECONDS);
  }

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < DIGITS - 1) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (!text) return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < DIGITS; i++) next[i] = text[i] ?? next[i];
      return next;
    });
    inputsRef.current[Math.min(text.length, DIGITS - 1)]?.focus();
  }

  const code = digits.join("");
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={code} />
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              aria-label={`Digit ${i + 1}`}
              className="h-13 w-11 rounded-xl border border-slate-200 text-center text-xl font-semibold text-[#0F172A] focus:border-[#14BBA4] focus:outline-none focus:ring-2 focus:ring-[#14BBA4]/30 sm:h-14 sm:w-12"
            />
          ))}
        </div>

        <AuthErrorText>{state.error}</AuthErrorText>

        <AuthButton type="submit" disabled={pending || code.length < DIGITS}>
          {pending ? "Verifying…" : "Verify"}
        </AuthButton>
      </form>

      <div className="text-center text-sm text-slate-500">
        {seconds > 0 ? (
          <span>
            Resend code in {mm}:{ss}
          </span>
        ) : (
          <form action={resendAction} className="inline">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="purpose" value={purpose} />
            <button type="submit" disabled={resendPending} className="font-semibold text-[#14BBA4] hover:text-[#109c88]">
              {resendPending ? "Sending…" : "Resend Code"}
            </button>
          </form>
        )}
        <AuthErrorText>{resendState.error}</AuthErrorText>
      </div>
    </div>
  );
}
