import type { Metadata } from "next";
import { Card, Heading } from "@/components/ui";
import { TERMS_VERSION } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy" };

const SECTIONS = [
  {
    title: "What we collect",
    body: "Your phone number (for sign-in and account identity), profile details you add (display name, city), listing details and photos you submit, and identity/ownership documents if you request verification.",
  },
  {
    title: "How we use it",
    body: "To run your account and listings, to verify ownership when you request it, to connect buyers and sellers through protected inquiries, and to review reports and moderate the marketplace.",
  },
  {
    title: "What we never do",
    body: "We never show your phone number to other users. Verification documents are reviewed by our team only and are never shown publicly or shared outside SeedhiDeal.",
  },
  {
    title: "Who can see what",
    body: "Your display name, city, and listing details are visible to other users browsing the marketplace. Your phone number, and any verification documents, are not.",
  },
  {
    title: "Data retention",
    body: "We keep account and listing records for as long as your account is active, plus a reasonable period afterward for support and audit purposes.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <Heading as="h1" className="mb-2">
        Privacy Policy
      </Heading>
      <p className="mb-8 text-sm text-muted">
        Version {TERMS_VERSION} — working draft. SeedhiDeal is a working name; full legal
        review of this policy is still pending.
      </p>
      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-6">
            <h2 className="mb-2 text-[16px] font-semibold text-foreground">{s.title}</h2>
            <p className="text-[15px] leading-relaxed text-body-soft">{s.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
