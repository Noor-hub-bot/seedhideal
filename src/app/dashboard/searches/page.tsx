import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, savedSearches } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Button, Card } from "@/components/ui";
import { deleteSavedSearchAction } from "@/lib/actions/saved-searches";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Saved searches" };

export default async function SavedSearchesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/searches");

  const mySearches = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, user.id))
    .orderBy(desc(savedSearches.createdAt));

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10">
      <h1 className="mb-1.5 font-display text-2xl font-medium leading-tight">Saved searches</h1>
      <p className="mb-6 text-sm text-muted">
        Save a search from the filters on{" "}
        <Link href="/cars" className="font-semibold text-brand hover:text-brand-strong">
          Browse cars
        </Link>{" "}
        to revisit it here.
      </p>

      {mySearches.length === 0 ? (
        <Card className="p-6 text-sm text-muted">You haven&apos;t saved any searches yet.</Card>
      ) : (
        <div className="space-y-3">
          {mySearches.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="mt-0.5 text-xs text-muted">Saved {formatDate(s.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/cars${s.queryString ? `?${s.queryString}` : ""}`}
                  className="text-[13px] font-semibold text-brand hover:text-brand-strong"
                >
                  Run search →
                </Link>
                <form action={deleteSavedSearchAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" variant="tertiary" className="px-2 py-2 text-xs">
                    Delete
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
