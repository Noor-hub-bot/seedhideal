import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, inquiries, listings, messages, users } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { Badge, Card, Heading } from "@/components/ui";
import { formatDate, formatPkr } from "@/lib/format";
import { ReportForm } from "@/components/report-form";
import { ReplyForm } from "./reply-form";

export const metadata: Metadata = { title: "Conversation" };

export default async function InquiryThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getSessionUser();
  if (!viewer) redirect(`/signin?next=/dashboard/inquiries/${id}`);

  const [row] = await db
    .select({ inquiry: inquiries, listing: listings, buyer: users })
    .from(inquiries)
    .innerJoin(listings, eq(inquiries.listingId, listings.id))
    .innerJoin(users, eq(inquiries.buyerId, users.id))
    .where(eq(inquiries.id, id));
  if (!row) notFound();
  const { inquiry, listing, buyer } = row;

  const isSeller = viewer.id === listing.sellerId;
  const isBuyer = viewer.id === buyer.id;
  if (!isSeller && !isBuyer) notFound();

  const thread = await db
    .select({ message: messages, sender: users })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.inquiryId, id))
    .orderBy(asc(messages.createdAt));

  const otherPartyLabel = isSeller ? buyer.displayName ?? "Buyer" : "Seller";
  const closed = ["declined", "closed"].includes(inquiry.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard" className="text-[13px] font-semibold text-muted hover:text-foreground">
        ← Back to dashboard
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading size="md">
            {listing.make} {listing.model} {listing.year}
          </Heading>
          <p className="mt-1 text-sm text-muted">
            {formatPkr(listing.askingPricePkr)} · with {otherPartyLabel}
          </p>
        </div>
        <Badge tone="brand" className="capitalize">{inquiry.intent}</Badge>
      </div>

      <div className="mt-2">
        <ReportForm
          listingId={listing.id}
          reportedUserId={isSeller ? buyer.id : listing.sellerId}
          signedIn
          label={`Report ${otherPartyLabel}`}
        />
      </div>

      <div className="mt-6 space-y-3">
        {thread.map(({ message, sender }) => {
          const mine = sender.id === viewer.id;
          return (
            <Card
              key={message.id}
              className={`max-w-[85%] p-3.5 ${mine ? "ml-auto bg-brand-soft" : ""}`}
            >
              <p className="mb-1 text-[12px] font-semibold text-muted">
                {mine ? "You" : sender.displayName ?? otherPartyLabel}
              </p>
              <p className="whitespace-pre-wrap text-sm">{message.body}</p>
              <p className="mt-1 text-[11px] text-muted">{formatDate(message.createdAt)}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-6">
        {closed ? (
          <Card className="p-4 text-sm text-muted">This conversation is closed.</Card>
        ) : (
          <ReplyForm inquiryId={inquiry.id} />
        )}
      </div>
    </div>
  );
}
