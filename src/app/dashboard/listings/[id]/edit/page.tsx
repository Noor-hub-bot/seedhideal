import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, listingPhotos, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { SellForm } from "@/app/sell/sell-form";

export const metadata: Metadata = { title: "Edit Listing" };

// Mirrors MUTABLE_STATES in src/lib/actions/marketplace.ts — kept in sync manually since
// this is a Server Component and that constant isn't exported (it's private to the actions
// module). Any status not in this set is terminal and can't be edited.
const EDITABLE_STATES = new Set(["draft", "submitted", "under_review", "correction", "active", "paused"]);

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=/dashboard/listings/${id}/edit`);

  const [listing] = await db.select().from(listings).where(eq(listings.id, id));
  if (!listing || listing.sellerId !== user.id) notFound();

  if (!EDITABLE_STATES.has(listing.status)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-[32px] font-medium leading-tight">Edit listing</h1>
        <Card className="mt-6 p-6 text-sm text-muted">
          <p>This listing can no longer be edited ({listing.status}).</p>
          <Link href="/dashboard/listings" className="mt-4 inline-block text-brand underline">
            Back to your listings
          </Link>
        </Card>
      </div>
    );
  }

  const photos = await db
    .select({ id: listingPhotos.id, storageKey: listingPhotos.storageKey })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, id))
    .orderBy(listingPhotos.sortOrder);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-[32px] font-medium leading-tight">Edit your listing</h1>
      <p className="mt-2 text-sm text-muted">
        Saving changes sends this listing back for review before it&apos;s live again.
      </p>
      <div className="mt-6">
        <SellForm
          mode="edit"
          listingId={listing.id}
          existingPhotos={photos}
          defaultValues={{
            make: listing.make,
            model: listing.model,
            variant: listing.variant,
            year: listing.year,
            city: listing.city,
            registrationCity: listing.registrationCity,
            mileageKm: listing.mileageKm,
            engineCc: listing.engineCc,
            transmission: listing.transmission,
            fuel: listing.fuel,
            ownershipCount: listing.ownershipCount,
            sellerType: listing.sellerType,
            askingPricePkr: listing.askingPricePkr,
            bodyType: listing.bodyType,
            assembly: listing.assembly,
            exteriorColor: listing.exteriorColor,
            interiorColor: listing.interiorColor,
            description: listing.description,
            features: listing.features,
            disclosures: listing.disclosures,
          }}
        />
      </div>
    </div>
  );
}
