import { Heading } from "@/components/ui";
import { PlusIcon } from "./icons";
import { FAQS } from "@/lib/faq-content";

// Native <details>/<summary> — fully accessible and keyboard-operable with
// zero JavaScript, no new dependency.

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
