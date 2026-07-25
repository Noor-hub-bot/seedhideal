import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBlockingListing } from "@/lib/actions/marketplace";
import { ButtonLink, Card } from "@/components/ui";
import { SellForm } from "./sell-form";

export const metadata: Metadata = { title: "Sell your car" };

export default async function SellPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/sell");

  const blocking = await getBlockingListing(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-[32px] font-medium leading-tight">List your car — free</h1>
      <p className="mt-2 text-sm text-muted">
        One free listing for private owners. Everything below is required
        before review; nothing is charged, now or at approval. Your phone
        number is never shown publicly.
      </p>
      {blocking ? (
        <Card className="mt-6 p-6 text-sm text-muted">
          <p>
            You already have a listing in progress ({blocking.make} {blocking.model}). Mark
            it sold or withdraw it from your dashboard before listing another car.
          </p>
          <ButtonLink href="/dashboard" className="mt-4">
            Go to dashboard
          </ButtonLink>
        </Card>
      ) : (
        <>
          <ol className="mt-4 space-y-1 rounded-card border border-border bg-surface p-4 text-sm text-muted">
            <li>1. Enter your car&apos;s details, photos and honest condition disclosures</li>
            <li>2. Our team reviews it (same-day during operating hours)</li>
            <li>3. Identity &amp; ownership verification follows before the listing goes live</li>
          </ol>
          <div className="mt-6">
            <SellForm />
          </div>
        </>
      )}
    </div>
  );
}
