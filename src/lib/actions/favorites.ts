"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, favorites } from "@/db";
import { getSessionUser } from "@/lib/auth";

export async function toggleFavoriteAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  const listingId = String(formData.get("listingId"));
  const [existing] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)));

  if (existing) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)));
  } else {
    await db.insert(favorites).values({ userId: user.id, listingId });
  }

  revalidatePath("/cars");
  revalidatePath(`/cars/${listingId}`);
  revalidatePath("/dashboard/favorites");
}
