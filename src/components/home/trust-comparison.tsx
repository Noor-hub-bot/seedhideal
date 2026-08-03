import { Heading } from "@/components/ui";
import { ChartIcon, IncognitoIcon, PriceTagIcon, SecureBuyingIcon, SpamIcon, VerificationIcon } from "./icons";

// Static value-prop copy — same category as the existing homepage's How-it-works and Why
// SeedhiDeal content, not data presented as fact. Kept verbatim from the previous plain-text
// version; only the presentation (comparison cards) changed.
const COMPARISONS = [
  {
    problem: "Dealers posing as owners",
    detail: "Bulk listings quietly controlled by dealers crowd out genuine sellers.",
    problemIcon: IncognitoIcon,
    response: "Identity and ownership evidence required, with dealers clearly labelled.",
    responseIcon: VerificationIcon,
  },
  {
    problem: "Low-quality, anonymous leads",
    detail: "Sellers get flooded with messages that never turn into a real visit.",
    problemIcon: SpamIcon,
    response: "Buyer phone verification and structured intent before any contact.",
    responseIcon: SecureBuyingIcon,
  },
  {
    problem: "Guesswork pricing",
    detail: "Asking prices copy each other and drift away from real sale values.",
    problemIcon: PriceTagIcon,
    response: "Transparent price ranges built from closed-sale data.",
    responseIcon: ChartIcon,
  },
] as const;

export function TrustComparison() {
  return (
    <section className="border-y border-border bg-surface px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Heading as="h2" size="lg" className="mb-3 text-center">
          Why marketplaces feel unsafe today
        </Heading>
        <p className="mx-auto mb-14 max-w-[640px] text-center text-muted">
          We built SeedhiDeal around the problems owners and buyers actually report.
        </p>
        <div className="flex flex-col gap-6">
          {COMPARISONS.map((c) => {
            const ProblemIcon = c.problemIcon;
            const ResponseIcon = c.responseIcon;
            return (
              <div
                key={c.problem}
                className="grid overflow-hidden rounded-2xl border border-border shadow-sm transition-shadow duration-300 hover:shadow-md sm:grid-cols-2"
              >
                <div className="border-l-4 border-alert bg-alert-soft p-7">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-alert-ink">
                      <ProblemIcon className="h-5 w-5" />
                    </div>
                    <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-alert-ink">
                      The problem
                    </div>
                  </div>
                  <div className="mb-2 font-semibold">{c.problem}</div>
                  <p className="text-sm leading-relaxed text-muted">{c.detail}</p>
                </div>
                <div className="border-l-4 border-brand bg-brand-soft p-7">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-brand-soft-ink">
                      <ResponseIcon className="h-5 w-5" />
                    </div>
                    <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-brand-soft-ink">
                      SeedhiDeal solution
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-body-soft">{c.response}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
