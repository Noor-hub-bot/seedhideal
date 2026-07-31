import { Heading } from "@/components/ui";
import { PlusIcon } from "./icons";

// Native <details>/<summary> — fully accessible and keyboard-operable with
// zero JavaScript, no new dependency.
const FAQS = [
  {
    q: "Are all sellers on SeedhiDeal really private owners?",
    a: "Yes, by default — every listing goes through identity and ownership verification before it goes live. A small number of dealer listings are clearly labelled as such.",
  },
  {
    q: "Is it free to list my car?",
    a: "Yes. Listing is free, with one active listing at a time for private sellers. There are no hidden charges at approval.",
  },
  {
    q: "How does verification work?",
    a: "You submit identity and ownership documents once; our team reviews them before your listing is approved and your profile is marked verified.",
  },
  {
    q: "Will my phone number be public?",
    a: "No — your number stays protected. Buyers reach you through a structured inquiry, and you choose when to share contact details or arrange a visit.",
  },
  {
    q: "What if I have an issue with a buyer or seller?",
    a: "You can report a listing or open a support ticket from your dashboard at any time — every report is tracked until it's resolved.",
  },
];

export function FaqAccordion() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-14">
      <Heading as="h2" size="lg" className="mb-8">
        Frequently asked questions
      </Heading>
      <div className="divide-y divide-border rounded-card border border-border bg-surface">
        {FAQS.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {f.q}
              <PlusIcon className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-45" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
