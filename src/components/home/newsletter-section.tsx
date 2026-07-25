import { Heading } from "@/components/ui";
import { NewsletterForm } from "./newsletter-form";

export function NewsletterSection() {
  return (
    <section className="border-y border-border bg-surface px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 text-center">
        <Heading as="h2" size="md">
          Get new listings in your inbox
        </Heading>
        <p className="max-w-md text-[15px] text-muted">
          Occasional emails about new verified listings and price guidance —
          no spam, unsubscribe any time.
        </p>
        <NewsletterForm />
      </div>
    </section>
  );
}
