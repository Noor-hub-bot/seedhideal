"use server";

import { eq } from "drizzle-orm";
import { db, newsletterSubscribers } from "@/db";

export type NewsletterFormState = { error?: string; subscribed?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeNewsletterAction(
  _prev: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { error: "Enter a valid email address." };
  }

  const [existing] = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email));

  // Already subscribed reads as success, not an error — nothing went wrong from
  // the visitor's point of view.
  if (!existing) {
    await db.insert(newsletterSubscribers).values({ email });
  }

  return { subscribed: true };
}
