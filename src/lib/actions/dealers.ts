"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, dealerProfiles } from "@/db";
import { getSessionUser } from "@/lib/auth";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  detectFileType,
  uploadDealerAsset,
} from "@/lib/storage";
import { CITIES } from "@/lib/constants";

const profileSchema = z.object({
  businessName: z.string().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  contactPhone: z.string().max(32).optional().or(z.literal("")),
  contactEmail: z.string().email().max(254).optional().or(z.literal("")),
  address: z.string().max(240).optional().or(z.literal("")),
  city: z.string().max(64).optional().or(z.literal("")),
});

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type DealerProfileFormState = { error?: string; saved?: boolean };

export async function updateDealerProfileAction(
  _prev: DealerProfileFormState,
  formData: FormData,
): Promise<DealerProfileFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: `${first.path.join(".")}: ${first.message}` };
  }
  const v = parsed.data;
  if (v.city && !CITIES.includes(v.city)) return { error: "Choose a valid city." };

  const workingHours: Record<string, string> = {};
  for (const day of DAYS) {
    const hours = String(formData.get(`hours_${day}`) ?? "").trim();
    if (hours) workingHours[day] = hours.slice(0, 32);
  }

  const [existing] = await db
    .select()
    .from(dealerProfiles)
    .where(eq(dealerProfiles.userId, user.id));

  let logoKey = existing?.logoKey ?? null;
  let coverImageKey = existing?.coverImageKey ?? null;

  for (const [field, kind] of [["logo", "logo"], ["cover", "cover"]] as const) {
    const file = formData.get(field);
    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_PHOTO_TYPES.has(file.type)) return { error: "Images must be JPG, PNG or WEBP." };
      if (file.size > MAX_PHOTO_BYTES) return { error: "Each image must be under 6MB." };
      const actualType = detectFileType(new Uint8Array(await file.arrayBuffer()));
      if (actualType !== file.type) return { error: "One of your images doesn't look like a valid file." };
      const key = await uploadDealerAsset(file, user.id, kind);
      if (kind === "logo") logoKey = key;
      else coverImageKey = key;
    }
  }

  const values = {
    businessName: v.businessName,
    description: v.description || null,
    contactPhone: v.contactPhone || null,
    contactEmail: v.contactEmail || null,
    address: v.address || null,
    city: v.city || null,
    workingHours,
    logoKey,
    coverImageKey,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(dealerProfiles).set(values).where(eq(dealerProfiles.userId, user.id));
  } else {
    await db.insert(dealerProfiles).values({ userId: user.id, ...values });
  }

  revalidatePath("/dashboard/dealer");
  revalidatePath(`/dealers/${user.id}`);
  return { saved: true };
}
