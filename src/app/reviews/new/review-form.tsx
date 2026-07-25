"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { submitReviewAction, type ReviewFormState } from "@/lib/actions/reviews";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";

const RATINGS = [
  { value: "5", label: "★★★★★ Excellent" },
  { value: "4", label: "★★★★ Good" },
  { value: "3", label: "★★★ Average" },
  { value: "2", label: "★★ Below average" },
  { value: "1", label: "★ Poor" },
];

export function ReviewForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ReviewFormState, FormData>(
    submitReviewAction,
    {},
  );

  if (state.sent) {
    return (
      <Card className="p-6 text-center">
        <p className="font-semibold">Thanks for sharing your experience.</p>
        <p className="mt-1 text-sm text-muted">
          Your review is queued for a quick check before it appears publicly.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-5"
          onClick={() => router.push("/")}
        >
          Back to homepage
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="rating">Rating</Label>
          <Select id="rating" name="rating" required defaultValue="5">
            {RATINGS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={120}
            placeholder="Sum up your experience"
          />
        </div>
        <div>
          <Label htmlFor="body">Your review</Label>
          <Textarea
            id="body"
            name="body"
            rows={5}
            required
            minLength={10}
            maxLength={2000}
            placeholder="What was buying or selling on SeedhiDeal like?"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isAnonymous"
            className="h-4 w-4 rounded border-border-input accent-current text-brand"
          />
          Post anonymously (your name won&apos;t be shown)
        </label>
        {state.error && (
          <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting…" : "Submit review"}
        </Button>
      </form>
    </Card>
  );
}
