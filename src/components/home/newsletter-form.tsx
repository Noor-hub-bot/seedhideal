"use client";

import { useActionState } from "react";
import { subscribeNewsletterAction, type NewsletterFormState } from "@/lib/actions/newsletter";
import { Button, Input } from "@/components/ui";

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState<NewsletterFormState, FormData>(
    subscribeNewsletterAction,
    {},
  );

  if (state.subscribed) {
    return <p className="text-[15px] font-medium">✓ You&apos;re on the list — thanks for subscribing.</p>;
  }

  return (
    <form action={formAction} className="w-full max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1"
        />
        <Button type="submit" disabled={pending} className="whitespace-nowrap">
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-alert-ink">
          {state.error}
        </p>
      )}
    </form>
  );
}
