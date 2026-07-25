import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, inquiries, listings, messages, users } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { INQUIRY_STATUS_LABEL } from "@/lib/dashboard-labels";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/dashboard/messages");

  const myListingIds = (
    await db.select({ id: listings.id }).from(listings).where(eq(listings.sellerId, user.id))
  ).map((l) => l.id);

  const [received, sent] = await Promise.all([
    myListingIds.length
      ? db
          .select({ inquiry: inquiries, buyer: users, listing: listings })
          .from(inquiries)
          .innerJoin(users, eq(inquiries.buyerId, users.id))
          .innerJoin(listings, eq(inquiries.listingId, listings.id))
          .where(inArray(inquiries.listingId, myListingIds))
          .orderBy(desc(inquiries.createdAt))
          .limit(30)
      : Promise.resolve([]),
    db
      .select({ inquiry: inquiries, listing: listings })
      .from(inquiries)
      .innerJoin(listings, eq(inquiries.listingId, listings.id))
      .where(eq(inquiries.buyerId, user.id))
      .orderBy(desc(inquiries.createdAt))
      .limit(30),
  ]);

  const inquiryIds = received.map((r) => r.inquiry.id);
  const firstMessages = inquiryIds.length
    ? await db.select().from(messages).where(inArray(messages.inquiryId, inquiryIds))
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 pb-10">
      <h1 className="font-display text-2xl font-medium leading-tight">Messages</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Inquiries received</h2>
        {received.length === 0 ? (
          <Card className="p-6 text-sm text-muted">
            No inquiries yet. Verified buyers will appear here when they contact you —
            your phone number stays hidden.
          </Card>
        ) : (
          <div className="space-y-3">
            {received.map(({ inquiry, buyer, listing }) => {
              const msg = firstMessages.find((m) => m.inquiryId === inquiry.id);
              return (
                <Card key={inquiry.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand" className="capitalize">
                      {inquiry.intent}
                    </Badge>
                    <span className="text-sm font-medium">{buyer.displayName ?? "Verified buyer"}</span>
                    <span className="text-xs text-muted">
                      {listing.make} {listing.model} · {formatDate(inquiry.createdAt)}
                    </span>
                  </div>
                  {msg && <p className="mt-2 line-clamp-2 text-sm">{msg.body}</p>}
                  <Link
                    href={`/dashboard/inquiries/${inquiry.id}`}
                    className="mt-2 inline-block text-[13px] font-semibold text-brand hover:text-brand-strong"
                  >
                    View &amp; reply →
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">My inquiries</h2>
        {sent.length === 0 ? (
          <Card className="p-6 text-sm text-muted">Inquiries you send to sellers will appear here.</Card>
        ) : (
          <div className="space-y-3">
            {sent.map(({ inquiry, listing }) => (
              <Card key={inquiry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">
                    {listing.make} {listing.model} {listing.year}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{formatDate(inquiry.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{INQUIRY_STATUS_LABEL[inquiry.status] ?? inquiry.status}</Badge>
                  <Link
                    href={`/dashboard/inquiries/${inquiry.id}`}
                    className="text-[13px] font-semibold text-brand hover:text-brand-strong"
                  >
                    View →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
