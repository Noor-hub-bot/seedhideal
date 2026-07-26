import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { updateProfileAction } from "@/lib/actions/auth";
import { Button, Card, Input, Label } from "@/components/ui";
import { CITIES } from "@/lib/constants";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/profile");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10">
      <h1 className="mb-1.5 font-display text-2xl font-medium leading-tight">Profile</h1>
      <p className="mb-6 text-sm text-muted">
        Your display name and city are shown to buyers and sellers instead of your
        phone number, which is never made public.
      </p>

      <Card className="p-5">
        <form action={updateProfileAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" defaultValue={user.displayName ?? ""} required />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" list="cities" defaultValue={user.city ?? ""} required />
            <datalist id="cities">
              {CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="font-semibold">Phone number</h2>
        <p className="mt-1 text-sm text-muted">{user.phone} — never shown to other users.</p>
      </Card>
    </div>
  );
}
