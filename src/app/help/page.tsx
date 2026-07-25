import type { Metadata } from "next";
import { ButtonLink, Card, Heading } from "@/components/ui";

export const metadata: Metadata = { title: "Help" };

const FAQS = [
  {
    q: "How does verification work?",
    a: "Every listing goes through an ownership and document check before it's marked Verified. Look for the gold Verified badge on a listing.",
  },
  {
    q: "Is it free to post my car?",
    a: "Yes — posting a listing is free. You'll only see a Verified badge cost if you choose to fast-track verification.",
  },
  {
    q: "How do I contact a seller?",
    a: "Open any listing and use the contact options there — no extra sign-up required to browse.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <Heading as="h1" className="mb-8">
        Help
      </Heading>
      <div className="space-y-4">
        {FAQS.map((item) => (
          <Card key={item.q} className="p-6">
            <h2 className="mb-2 text-[16px] font-semibold text-foreground">
              {item.q}
            </h2>
            <p className="text-[15px] text-body-soft">{item.a}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-8 p-6 text-center">
        <h2 className="mb-2 text-[16px] font-semibold text-foreground">Still need help?</h2>
        <p className="mb-4 text-[15px] text-body-soft">
          Open a support ticket and our team will follow up.
        </p>
        <ButtonLink href="/dashboard/support/new">Contact support</ButtonLink>
      </Card>
    </div>
  );
}
