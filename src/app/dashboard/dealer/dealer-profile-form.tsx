"use client";

import { useActionState } from "react";
import {
  updateDealerProfileAction,
  type DealerProfileFormState,
} from "@/lib/actions/dealers";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { CITIES } from "@/lib/constants";
import type { dealerProfiles } from "@/db";

type Profile = typeof dealerProfiles.$inferSelect;

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

export function DealerProfileForm({ profile }: { profile?: Profile }) {
  const [state, formAction, pending] = useActionState<DealerProfileFormState, FormData>(
    updateDealerProfileAction,
    {},
  );

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-5">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-1 font-semibold sm:col-span-2">Business details</legend>
          <div className="sm:col-span-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              name="businessName"
              defaultValue={profile?.businessName ?? ""}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={4} defaultValue={profile?.description ?? ""} />
          </div>
          <div>
            <Label htmlFor="contactPhone">Contact phone</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={profile?.contactPhone ?? ""} />
          </div>
          <div>
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={profile?.contactEmail ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Select id="city" name="city" defaultValue={profile?.city ?? ""}>
              <option value="">Select city</option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={profile?.address ?? ""} />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold">Logo &amp; cover image (optional)</legend>
          <div>
            <Label htmlFor="logo">Logo</Label>
            <Input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
          </div>
          <div>
            <Label htmlFor="cover">Cover image</Label>
            <Input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold">Working hours (optional)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DAYS.map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <Label className="mb-0 w-24 shrink-0 text-[13px]">{label}</Label>
                <Input
                  name={`hours_${key}`}
                  placeholder="e.g. 9am - 6pm"
                  defaultValue={profile?.workingHours?.[key] ?? ""}
                />
              </div>
            ))}
          </div>
        </fieldset>

        {state.error && (
          <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
            {state.error}
          </p>
        )}
        {state.saved && <p className="text-sm text-brand">✓ Profile saved.</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save dealer profile"}
        </Button>
      </form>
    </Card>
  );
}
