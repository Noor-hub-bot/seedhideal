import { Heading } from "@/components/ui";
import { ChatIcon, ClipboardIcon, HandshakeIcon, VerificationIcon } from "./icons";

// Static value-prop copy, kept verbatim from the previous plain-list version — only the
// presentation (connected numbered timeline) changed.
const STEPS = [
  { title: "Verify", detail: "Confirm your phone, identity and ownership evidence.", icon: VerificationIcon },
  { title: "List", detail: "Add structured details, condition disclosure and photos.", icon: ClipboardIcon },
  { title: "Connect", detail: "Receive verified inquiries without exposing your number.", icon: ChatIcon },
  { title: "Meet & sell", detail: "Confirm a visit, close the deal, share the outcome.", icon: HandshakeIcon },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-22">
      <Heading as="h2" size="lg" className="mb-3 text-center">
        How it works
      </Heading>
      <p className="mx-auto mb-16 max-w-[520px] text-center text-muted">
        Four steps from first listing to a closed, verified deal.
      </p>

      <div className="relative flex flex-col gap-10 sm:flex-row sm:gap-0">
        {/* Connecting line, drawn behind the numbered circles — vertical through their
            centers on mobile (stacked), horizontal through their centers on desktop
            (4 equal columns, so the centers sit at 12.5%/37.5%/62.5%/87.5%). */}
        <div className="absolute left-7 top-3 bottom-3 w-0.5 bg-gradient-to-b from-transparent via-brand/40 to-transparent sm:left-[12.5%] sm:right-[12.5%] sm:top-7 sm:bottom-auto sm:h-0.5 sm:w-auto sm:bg-gradient-to-r" />

        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="group relative flex gap-5 sm:flex-1 sm:flex-col sm:items-center sm:gap-0 sm:text-center">
              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-surface text-brand-soft-ink shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-brand-strong group-hover:shadow-md sm:mb-5">
                <Icon className="h-6 w-6" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
              </div>
              <div className="sm:px-3">
                <div className="mb-1.5 font-semibold">{s.title}</div>
                <p className="text-sm leading-relaxed text-muted">{s.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
