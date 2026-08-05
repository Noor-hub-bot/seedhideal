import type { Metadata } from "next";
import { ButtonLink, Card, Heading } from "@/components/ui";
import { FAQS } from "@/lib/faq-content";

export const metadata: Metadata = { title: "Help" };

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
