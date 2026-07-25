import type { Metadata } from "next";
import { Card, Heading } from "@/components/ui";
import { TERMS_VERSION } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms of Service" };

const SECTIONS = [
  {
    title: "Who this is for",
    body: "SeedhiDeal is a marketplace for private car owners in Pakistan to list and sell their own vehicles, and for buyers to find and contact them. By creating an account you agree to use it for that purpose.",
  },
  {
    title: "Honest listings",
    body: "You must be the owner (or a family member/representative acting for the owner) of any car you list, and must disclose known condition issues accurately. Listings found to misrepresent ownership or condition may be removed.",
  },
  {
    title: "Protected contact",
    body: "Your phone number is never shown to other users. Never send an advance payment or share an OTP code with anyone claiming to be a buyer or seller — always meet in person before paying.",
  },
  {
    title: "Verification documents",
    body: "Identity and ownership documents you submit for verification are reviewed by our team only and are never shown publicly.",
  },
  {
    title: "Account actions",
    body: "We may restrict or deactivate accounts that violate these terms, post fraudulent listings, or abuse the platform.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <Heading as="h1" className="mb-2">
        Terms of Service
      </Heading>
      <p className="mb-8 text-sm text-muted">
        Version {TERMS_VERSION} — working draft. SeedhiDeal is a working name; full legal
        review of these terms is still pending.
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
