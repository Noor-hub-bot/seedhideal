"use client";

import { useActionState, useState } from "react";
import {
  editListingAction,
  submitListingAction,
  type ListingFormState,
} from "@/lib/actions/marketplace";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import {
  ASSEMBLY_OPTIONS,
  BODY_TYPES,
  CITIES,
  COLORS,
  MAKES,
  MAX_PHOTOS,
  MIN_PHOTOS,
  SELLER_TYPES,
} from "@/lib/constants";

export type ListingDefaults = {
  make: string;
  model: string;
  variant: string | null;
  year: number;
  city: string;
  registrationCity: string | null;
  mileageKm: number;
  engineCc: number | null;
  transmission: string;
  fuel: string;
  ownershipCount: number | null;
  sellerType: string;
  askingPricePkr: number;
  bodyType: string | null;
  assembly: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  description: string | null;
  disclosures: {
    paintedPanels?: string;
    accidentHistory?: string;
    mechanicalIssues?: string;
    documents?: string;
  } | null;
};

export type ExistingListingPhoto = { id: string; storageKey: string };

export function SellForm({
  mode = "create",
  listingId,
  defaultValues,
  existingPhotos = [],
}: {
  mode?: "create" | "edit";
  listingId?: string;
  defaultValues?: ListingDefaults;
  existingPhotos?: ExistingListingPhoto[];
}) {
  const action = mode === "edit" ? editListingAction : submitListingAction;
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(action, {});
  const [previews, setPreviews] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  function onPhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    previews.forEach((url) => URL.revokeObjectURL(url));
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function toggleRemove(id: string) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const d = defaultValues;
  const disclosures = d?.disclosures;

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-5">
        {mode === "edit" && listingId && <input type="hidden" name="listingId" value={listingId} />}
        {[...removedIds].map((id) => (
          <input key={id} type="hidden" name="removePhotoIds" value={id} />
        ))}

        <fieldset className="space-y-4">
          <legend className="font-semibold">Vehicle</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="make">Make</Label>
              <Select id="make" name="make" required defaultValue={d?.make ?? ""}>
                <option value="" disabled>
                  Select make
                </option>
                {MAKES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input id="model" name="model" placeholder="e.g. Corolla" defaultValue={d?.model} required />
            </div>
            <div>
              <Label htmlFor="variant">Variant (optional)</Label>
              <Input id="variant" name="variant" placeholder="e.g. Altis 1.6" defaultValue={d?.variant ?? ""} />
            </div>
            <div>
              <Label htmlFor="year">Model year</Label>
              <Input
                id="year"
                name="year"
                type="number"
                min={1980}
                max={2027}
                defaultValue={d?.year}
                required
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Select id="city" name="city" required defaultValue={d?.city ?? ""}>
                <option value="" disabled>
                  Select city
                </option>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="registrationCity">Registration city</Label>
              <Input
                id="registrationCity"
                name="registrationCity"
                placeholder="e.g. Lahore"
                defaultValue={d?.registrationCity ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="mileageKm">Mileage (km)</Label>
              <Input id="mileageKm" name="mileageKm" type="number" min={0} defaultValue={d?.mileageKm} required />
            </div>
            <div>
              <Label htmlFor="engineCc">Engine size (cc, optional)</Label>
              <Input
                id="engineCc"
                name="engineCc"
                type="number"
                min={0}
                placeholder="e.g. 1300"
                defaultValue={d?.engineCc ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="transmission">Transmission</Label>
              <Select id="transmission" name="transmission" required defaultValue={d?.transmission ?? "manual"}>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="fuel">Fuel</Label>
              <Select id="fuel" name="fuel" required defaultValue={d?.fuel ?? "petrol"}>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Electric</option>
                <option value="cng">CNG</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ownershipCount">Number of owners</Label>
              <Input
                id="ownershipCount"
                name="ownershipCount"
                type="number"
                min={1}
                max={20}
                defaultValue={d?.ownershipCount ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="sellerType">You are listing as</Label>
              <Select id="sellerType" name="sellerType" required defaultValue={d?.sellerType ?? "individual"}>
                {SELLER_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="askingPricePkr">Asking price (PKR)</Label>
              <Input
                id="askingPricePkr"
                name="askingPricePkr"
                type="number"
                min={50000}
                step={10000}
                placeholder="e.g. 4500000"
                defaultValue={d?.askingPricePkr}
                required
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-semibold">Appearance & build (optional)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bodyType">Body type</Label>
              <Select id="bodyType" name="bodyType" defaultValue={d?.bodyType ?? ""}>
                <option value="">Not specified</option>
                {BODY_TYPES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="assembly">Assembly</Label>
              <Select id="assembly" name="assembly" defaultValue={d?.assembly ?? ""}>
                <option value="">Not specified</option>
                {ASSEMBLY_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="exteriorColor">Exterior color</Label>
              <Select id="exteriorColor" name="exteriorColor" defaultValue={d?.exteriorColor ?? ""}>
                <option value="">Not specified</option>
                {COLORS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="interiorColor">Interior color</Label>
              <Select id="interiorColor" name="interiorColor" defaultValue={d?.interiorColor ?? ""}>
                <option value="">Not specified</option>
                {COLORS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold">Photos</legend>

          {existingPhotos.length > 0 && (
            <div>
              <p className="text-xs text-muted">Current photos — uncheck to remove one</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {existingPhotos.map((p) => (
                  <label key={p.id} className="relative block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.storageKey}
                      alt=""
                      className={`aspect-square rounded-input object-cover ${removedIds.has(p.id) ? "opacity-30" : ""}`}
                    />
                    <input
                      type="checkbox"
                      defaultChecked
                      onChange={() => toggleRemove(p.id)}
                      className="absolute right-1.5 top-1.5 h-4 w-4"
                      aria-label="Keep this photo"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted">
            {mode === "edit"
              ? `Add more photos, or leave this empty to keep your current set. Keep ${MIN_PHOTOS}–${MAX_PHOTOS} total.`
              : `Upload ${MIN_PHOTOS}–${MAX_PHOTOS} clear photos — front, rear, both sides, interior and odometer help buyers trust the listing.`}
          </p>
          <Input
            type="file"
            name="photos"
            accept="image/jpeg,image/png,image/webp"
            multiple
            required={mode === "create"}
            onChange={onPhotosChange}
          />
          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt={`Selected photo ${i + 1}`}
                  className="aspect-square rounded-input object-cover"
                />
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-semibold">Honest condition disclosure</legend>
          <p className="text-xs text-muted">
            Buyers see these answers exactly as written. Hiding known damage is
            a policy violation and leads to listing removal.
          </p>
          <div>
            <Label htmlFor="paintedPanels">Painted / repaired panels</Label>
            <Input
              id="paintedPanels"
              name="paintedPanels"
              placeholder={'e.g. "None" or "Front bumper repainted"'}
              defaultValue={disclosures?.paintedPanels ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="accidentHistory">Accident history</Label>
            <Input
              id="accidentHistory"
              name="accidentHistory"
              placeholder={'e.g. "None" or "Minor rear collision 2023, repaired"'}
              defaultValue={disclosures?.accidentHistory ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="mechanicalIssues">Known mechanical issues</Label>
            <Input
              id="mechanicalIssues"
              name="mechanicalIssues"
              placeholder={'e.g. "None" or "AC needs regassing"'}
              defaultValue={disclosures?.mechanicalIssues ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="documents">Documents</Label>
            <Input
              id="documents"
              name="documents"
              placeholder={'e.g. "Complete file, both keys, biometric ready"'}
              defaultValue={disclosures?.documents ?? ""}
              required
            />
          </div>
        </fieldset>

        <div>
          <Label htmlFor="description">Anything else buyers should know (optional)</Label>
          <Textarea id="description" name="description" rows={4} defaultValue={d?.description ?? ""} />
        </div>

        {state.error && (
          <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? mode === "edit"
              ? "Saving…"
              : "Submitting…"
            : mode === "edit"
              ? "Save changes — send for review"
              : "Submit for review — free"}
        </Button>
      </form>
    </Card>
  );
}
