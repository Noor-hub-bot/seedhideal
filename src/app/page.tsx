import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { desc, eq } from "drizzle-orm";
import { db, listingPhotos, listings } from "@/db";
import { Badge, ButtonLink, Card, Heading } from "@/components/ui";
import { formatKm, formatPkr } from "@/lib/format";
import { SearchBar } from "@/components/search-bar";
import { BrandGrid } from "@/components/home/brand-grid";
import { BodyTypeGrid } from "@/components/home/body-type-grid";
import { BudgetGrid } from "@/components/home/budget-grid";
import { BrowseByTabs } from "@/components/home/browse-by-tabs";
import { RecentlyAdded } from "@/components/home/recently-added";
import { FeaturedCarRail } from "@/components/home/featured-car-rail";
import { VerifiedSellers } from "@/components/home/verified-sellers";
import { FeaturedDealers } from "@/components/home/featured-dealers";
import { ReviewsSection } from "@/components/home/reviews-section";
import { StatisticsBand } from "@/components/home/statistics-band";
import { WhySeedhiDeal } from "@/components/home/why-seedhideal";
import { DownloadApp } from "@/components/home/download-app";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { FaqAccordion } from "@/components/home/faq-accordion";
import { SkeletonGrid, SkeletonRail, SkeletonBand, SkeletonSection } from "@/components/home/skeleton";
import { CheckIcon } from "@/components/home/icons";

const PROBLEMS = [
  {
    problem: "Dealers posing as owners",
    detail: "Bulk listings quietly controlled by dealers crowd out genuine sellers.",
    response: "Identity and ownership evidence required, with dealers clearly labelled.",
  },
  {
    problem: "Low-quality, anonymous leads",
    detail: "Sellers get flooded with messages that never turn into a real visit.",
    response: "Buyer phone verification and structured intent before any contact.",
  },
  {
    problem: "Guesswork pricing",
    detail: "Asking prices copy each other and drift away from real sale values.",
    response: "Transparent price ranges built from closed-sale data.",
  },
];

const STEPS = [
  { title: "Verify", detail: "Confirm your phone, identity and ownership evidence." },
  { title: "List", detail: "Add structured details, condition disclosure and photos." },
  { title: "Connect", detail: "Receive verified inquiries without exposing your number." },
  { title: "Meet & sell", detail: "Confirm a visit, close the deal, share the outcome." },
];

export const metadata: Metadata = { title: "Browse verified cars" };

// No production domain is configured anywhere in this project yet (brand/legal
// checks are still pending per BRANDING.md) — falls back to localhost rather
// than asserting an unconfirmed public URL. Set NEXT_PUBLIC_SITE_URL once a
// real domain exists.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "SeedhiDeal",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.jpg`,
    },
    {
      "@type": "WebSite",
      name: "SeedhiDeal",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/cars?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

type Listing = typeof listings.$inferSelect;
type ListingPhoto = typeof listingPhotos.$inferSelect;

async function fetchHeroListing(): Promise<
  { listing: Listing; photo?: ListingPhoto } | undefined
> {
  try {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.status, "active"))
      .orderBy(desc(listings.approvedAt))
      .limit(1);
    if (!listing) return undefined;

    const [photo] = await db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listing.id))
      .limit(1);

    return { listing, photo };
  } catch {
    return undefined;
  }
}

export default async function LandingPage() {
  // Sits outside any Suspense boundary on purpose (LCP element) — a transient
  // DB hiccup here should degrade to the existing "no featured listing yet"
  // state below, not take down the whole homepage the way every other
  // section's query safely can behind its own Suspense boundary.
  const hero = await fetchHeroListing();
  const featured = hero?.listing;
  const featuredPhoto = hero?.photo;
  // Combined so the JSX below can narrow both together (TS can't infer that
  // `featuredPhoto` being set implies `featured` is too, across two separate
  // optional variables).
  const featuredWithPhoto = featured && featuredPhoto ? { featured, featuredPhoto } : undefined;

  return (
    <div>
      {/* JSON-LD structured data — real, no fabricated ratings */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* HERO — kept outside any Suspense boundary: this is the LCP element and
          should paint as part of the static shell, not wait on a section query. */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-10 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-24">
        <div>
          <Badge tone="verified" className="mb-7 px-3.5 py-[7px]">
            <CheckIcon className="h-3.5 w-3.5 shrink-0" /> Every listing verified — identity &amp; ownership
          </Badge>
          <Heading size="display" className="max-w-[600px]">
            Sell with confidence. Buy with proof.
          </Heading>
          <p className="mt-5 max-w-[520px] text-[19px] leading-relaxed text-body-soft">
            A trust-first marketplace for verified private-owner cars in
            Pakistan. Real owners, real buyers, no dealers in disguise — and
            never a surprise listing charge.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <ButtonLink href="/sell" className="px-7 py-[15px] text-base">
              List your car free
            </ButtonLink>
            <ButtonLink
              href="/cars"
              variant="secondary"
              className="px-7 py-[15px] text-base"
            >
              Browse verified cars
            </ButtonLink>
          </div>
          <div className="mt-11 flex gap-8">
            {(
              [
                ["100%", "Owner identity verified"],
                ["0", "Hidden listing charges"],
                ["1", "Ticket per issue, always tracked"],
              ] as const
            ).map(([stat, label]) => (
              <div key={label}>
                <div className="font-display text-[26px] font-medium">{stat}</div>
                <div className="text-[13px] text-muted">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured verified listing */}
        <Card className="rounded-[20px] p-7">
          {featuredWithPhoto ? (
            <div className="relative mb-5 h-[220px] overflow-hidden rounded-[14px]">
              <Image
                src={featuredWithPhoto.featuredPhoto.storageKey}
                alt={`${featuredWithPhoto.featured.make} ${featuredWithPhoto.featured.model}`}
                fill
                priority
                sizes="(min-width: 1024px) 500px, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="photo-placeholder mb-5 h-[220px] rounded-[14px]">
              verified owner &amp; car photo
            </div>
          )}
          {featured ? (
            <>
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[17px] font-semibold">
                    {featured.make} {featured.model}
                    {featured.variant ? ` ${featured.variant}` : ""},{" "}
                    {featured.year}
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    {featured.city} · {formatKm(featured.mileageKm)} ·{" "}
                    {featured.transmission === "automatic"
                      ? "Automatic"
                      : "Manual"}
                  </p>
                </div>
                <Badge tone="verified" className="whitespace-nowrap px-2.5 py-[5px] text-[11px]">
                  <CheckIcon className="h-3 w-3 shrink-0" /> Verified
                </Badge>
              </div>
              <p className="mb-4 font-display text-2xl font-medium">
                {formatPkr(featured.askingPricePkr)}
              </p>
            </>
          ) : (
            <p className="mb-4 text-sm text-muted">
              Verified listings appear here as sellers pass review.
            </p>
          )}
          <p className="border-t border-border pt-3.5 text-[13px] text-muted">
            Phone number protected until you request a visit
          </p>
        </Card>
      </section>

      {/* SEARCH BAR */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <SearchBar variant="expanded" />
      </section>

      <BrowseByTabs
        brand={
          <Suspense fallback={<SkeletonGrid tiles={6} />}>
            <BrandGrid />
          </Suspense>
        }
        bodyType={
          <Suspense fallback={<SkeletonGrid tiles={7} />}>
            <BodyTypeGrid />
          </Suspense>
        }
        budget={
          <Suspense fallback={<SkeletonGrid tiles={5} />}>
            <BudgetGrid />
          </Suspense>
        }
      />

      <Suspense fallback={<SkeletonSection><SkeletonRail /></SkeletonSection>}>
        <RecentlyAdded />
      </Suspense>

      <Suspense fallback={null}>
        <FeaturedCarRail />
      </Suspense>

      <Suspense fallback={<SkeletonSection><SkeletonGrid tiles={6} /></SkeletonSection>}>
        <VerifiedSellers />
      </Suspense>

      <Suspense fallback={null}>
        <FeaturedDealers />
      </Suspense>

      <Suspense fallback={null}>
        <ReviewsSection />
      </Suspense>

      <Suspense fallback={<SkeletonBand className="h-32" />}>
        <StatisticsBand />
      </Suspense>

      {/* PROBLEM / RESPONSE — existing content, kept verbatim */}
      <section className="border-y border-border bg-surface px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Heading as="h2" size="lg" className="mb-3">
            Why marketplaces feel unsafe today
          </Heading>
          <p className="mb-12 max-w-[640px] text-muted">
            We built SeedhiDeal around the problems owners and buyers actually
            report.
          </p>
          <div className="grid overflow-hidden rounded-card border border-border bg-border md:grid-cols-3 md:gap-px">
            {PROBLEMS.map((p) => (
              <div key={p.problem} className="bg-surface p-8">
                <div className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-alert-ink">
                  The problem
                </div>
                <div className="mb-2 font-semibold">{p.problem}</div>
                <p className="mb-5 text-sm leading-relaxed text-muted">
                  {p.detail}
                </p>
                <div className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-brand-soft-ink">
                  Our response
                </div>
                <p className="text-sm leading-relaxed text-body-soft">
                  {p.response}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — existing content, kept verbatim */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-22">
        <Heading as="h2" size="lg" className="mb-12">
          How it works
        </Heading>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-soft-ink">
                {i + 1}
              </div>
              <div className="mb-1.5 font-semibold">{s.title}</div>
              <p className="text-sm leading-relaxed text-muted">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <WhySeedhiDeal />
      <DownloadApp />
      <NewsletterSection />
      <FaqAccordion />

      {/* CTA BAND — existing content, kept verbatim */}
      <section className="bg-brand px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg" className="mb-4 text-white">
            Ready for a seedhi deal?
          </Heading>
          <p className="mb-8 text-[17px] text-brand-soft">
            List your car free, or browse verified inventory in your city
            today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <ButtonLink href="/sell" variant="secondary" className="px-7 py-[15px] text-base">
              List your car free
            </ButtonLink>
            <ButtonLink
              href="/cars"
              className="border border-white/40 bg-transparent px-7 py-[15px] text-base text-white hover:bg-white/10"
            >
              Browse cars
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
