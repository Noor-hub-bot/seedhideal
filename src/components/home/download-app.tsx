import { Badge, Card, Heading } from "@/components/ui";

// No mobile app exists yet — buttons are visibly disabled (no href, aria-disabled)
// rather than linking to store pages that don't exist. Swapping in real store
// URLs later is a one-line change per button.
export function DownloadApp() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <Card className="flex flex-col items-center gap-6 p-10 text-center sm:p-14">
        <Badge tone="neutral">Coming soon</Badge>
        <Heading as="h2" size="md">
          The SeedhiDeal app
        </Heading>
        <p className="max-w-md text-[15px] leading-relaxed text-muted">
          A dedicated mobile app is on the way, for faster browsing and
          instant alerts on cars you&apos;re watching.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <DisabledStoreButton label="Download on the" store="App Store" />
          <DisabledStoreButton label="Get it on" store="Google Play" />
        </div>
      </Card>
    </section>
  );
}

function DisabledStoreButton({ label, store }: { label: string; store: string }) {
  return (
    <span
      aria-disabled="true"
      className="inline-flex cursor-not-allowed items-center gap-2.5 rounded-control border border-border-input bg-neutral-chip px-5 py-3 text-muted opacity-70"
    >
      <StoreIcon />
      <span className="text-left leading-tight">
        <span className="block text-[11px]">{label}</span>
        <span className="block text-sm font-semibold">{store}</span>
      </span>
    </span>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M9 18h6" />
    </svg>
  );
}
