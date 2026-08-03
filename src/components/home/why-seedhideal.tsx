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
    <section className="mx-auto max-w-6xl px-6 py-20">
      <Heading as="h2" size="lg" className="mb-3 text-center">
        Why SeedhiDeal
      </Heading>
      <p className="mx-auto mb-14 max-w-[520px] text-center text-muted">
        Everything about the marketplace is built around one idea: trust you can verify.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-soft hover:shadow-lg"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-soft-ink transition-transform duration-300 group-hover:scale-110">
              <p.icon className="h-6 w-6" />
            </div>
            <div className="mb-2 font-semibold">{p.title}</div>
            <p className="text-sm leading-relaxed text-muted">{p.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
