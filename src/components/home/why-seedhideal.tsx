import { Heading } from "@/components/ui";
import {
  TrustIcon,
  VerificationIcon,
  SecureBuyingIcon,
  FastSearchIcon,
  EasySellingIcon,
} from "./icons";

// Static value-prop copy — same category as the existing homepage's
// Problem/Response and How-it-works content, not data presented as fact.
const PILLARS = [
  { title: "Trust", detail: "Every seller is a real, accountable person — no anonymous listings.", icon: TrustIcon },
  { title: "Verification", detail: "Identity and ownership evidence checked before a listing goes live.", icon: VerificationIcon },
  { title: "Secure buying", detail: "Contact stays protected until you're ready to arrange a visit.", icon: SecureBuyingIcon },
  { title: "Fast search", detail: "Purpose-built filters get you to the right car in a few taps.", icon: FastSearchIcon },
  { title: "Easy selling", detail: "List for free in minutes — structured details, no guesswork.", icon: EasySellingIcon },
];

export function WhySeedhiDeal() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <Heading as="h2" size="lg" className="mb-10">
        Why SeedhiDeal
      </Heading>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {PILLARS.map((p) => (
          <div key={p.title}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-soft-ink">
              <p.icon className="h-5 w-5" />
            </div>
            <div className="mb-1.5 font-semibold">{p.title}</div>
            <p className="text-sm leading-relaxed text-muted">{p.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
