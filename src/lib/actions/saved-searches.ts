"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, savedSearches } from "@/db";
import { getSessionUser } from "@/lib/auth";

export type SaveSearchFormState = { error?: string; saved?: boolean };

export async function saveSearchAction(
  _prev: SaveSearchFormState,
  formData: FormData,
): Promise<SaveSearchFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in to save searches." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const queryString = String(formData.get("queryString") ?? "").trim().replace(/^\?/, "");
  if (!name) return { error: "Give this search a name." };
  if (queryString.length > 2000) return { error: "Search is too long to save." };

  await db.insert(savedSearches).values({ userId: user.id, name, queryString });
  revalidatePath("/dashboard/searches");
  return { saved: true };
}

export async function deleteSavedSearchAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const id = String(formData.get("id"));

  await db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)));
  revalidatePath("/dashboard/searches");
}
