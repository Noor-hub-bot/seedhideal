import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, desc, eq } from "drizzle-orm";
import { db, listingPhotos, listings } from "@/db";
import { getSiteSettings } from "@/lib/site-settings";
import { Badge, ButtonLink, Card, Heading } from "@/components/ui";
import { PhotoCarousel } from "@/components/photo-carousel";
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
import { SocialProof } from "@/components/home/social-proof";
import { StatisticsBand } from "@/components/home/statistics-band";
import { TrustComparison } from "@/components/home/trust-comparison";
import { HowItWorks } from "@/components/home/how-it-works";
import { WhySeedhiDeal } from "@/components/home/why-seedhideal";
import { DownloadApp } from "@/components/home/download-app";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { FaqAccordion } from "@/components/home/faq-accordion";
import { SkeletonGrid, SkeletonRail, SkeletonBand, SkeletonSection } from "@/components/home/skeleton";
import { CheckIcon } from "@/components/home/icons";

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
  { listing: Listing; photos: ListingPhoto[] } | undefined
> {
  try {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.status, "active"))
      .orderBy(desc(listings.approvedAt))
      .limit(1);
    if (!listing) return undefined;

    const photos = await db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listing.id))
      .orderBy(asc(listingPhotos.sortOrder));

    return { listing, photos };
  } catch {
    return undefined;
  }
}

export default async function LandingPage() {
  // Sits outside any Suspense boundary on purpose (LCP element) — a transient
  // DB hiccup here should degrade to the existing "no featured listing yet"
  // state below, not take down the whole homepage the way every other
  // section's query safely can behind its own Suspense boundary.
  const [hero, settings] = await Promise.all([fetchHeroListing(), getSiteSettings()]);
  const { homepage } = settings;
  const sections = homepage.sections;
  const featured = hero?.listing;
  // Combined so the JSX below can narrow both together (TS can't infer that
  // `featuredPhotos` being non-empty implies `featured` is too, across two separate
  // optional variables).
  const featuredWithPhotos =
    hero && hero.photos.length > 0 ? { featured: hero.listing, featuredPhotos: hero.photos } : undefined;

  return (
    <div>
      {/* JSON-LD structured data — real, no fabricated ratings */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* HERO — kept outside any Suspense boundary: this is the LCP element and
          should paint as part of the static shell, not wait on a section query.
          The background image layer only renders once an admin sets one (Website
          Settings > Homepage) — with none set this section looks identical to before. */}
      <section
        className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-10 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-24"
        style={
          homepage.heroBackgroundImage
            ? {
                backgroundImage: `linear-gradient(color-mix(in oklab, var(--color-background) 88%, transparent), var(--color-background)), url(${homepage.heroBackgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div>
          <Badge tone="verified" className="mb-7 px-3.5 py-[7px]">
            <CheckIcon className="h-3.5 w-3.5 shrink-0" /> Every listing verified — identity &amp; ownership
          </Badge>
          <Heading size="display" className="max-w-[600px]">
            {homepage.heroTitle}
          </Heading>
          <p className="mt-5 max-w-[520px] text-[19px] leading-relaxed text-body-soft">
            {homepage.heroSubtitle}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            {homepage.heroButtonText && (
              <ButtonLink href={homepage.heroButtonLink || "/sell"} className="px-7 py-[15px] text-base">
                {homepage.heroButtonText}
              </ButtonLink>
            )}
            {homepage.heroButtonSecondaryText && (
              <ButtonLink
                href={homepage.heroButtonSecondaryLink || "/cars"}
                variant="secondary"
                className="px-7 py-[15px] text-base"
              >
                {homepage.heroButtonSecondaryText}
              </ButtonLink>
            )}
          </div>
          {homepage.stats.length > 0 && (
            <div className="mt-11 flex gap-8">
              {homepage.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="font-display text-[26px] font-medium">{stat.value}</div>
                  <div className="text-[13px] text-muted">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Featured verified listing */}
        <Card className="rounded-[20px] p-7">
          {featuredWithPhotos ? (
            <PhotoCarousel
              photos={featuredWithPhotos.featuredPhotos.map((p) => p.storageKey)}
              alt={`${featuredWithPhotos.featured.make} ${featuredWithPhotos.featured.model}`}
              className="mb-5"
              aspectClassName="h-[220px]"
              roundedClassName="rounded-[14px]"
              objectFit="contain"
              whiteBackground
              showArrows="hover"
              autoplayMs={4000}
              priority
              imageSizes="(min-width: 1024px) 500px, 100vw"
            />
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

      {sections.browseBy && (
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
      )}

      {sections.recentlyAdded && (
        <Suspense fallback={<SkeletonSection><SkeletonRail /></SkeletonSection>}>
          <RecentlyAdded />
        </Suspense>
      )}

      {sections.featuredCars && (
        <Suspense fallback={null}>
          <FeaturedCarRail />
        </Suspense>
      )}

      {sections.verifiedSellers && (
        <Suspense fallback={<SkeletonSection><SkeletonGrid tiles={6} /></SkeletonSection>}>
          <VerifiedSellers />
        </Suspense>
      )}

      {sections.socialProof && (
        <SocialProof
          dealers={
            <Suspense fallback={null}>
              <FeaturedDealers />
            </Suspense>
          }
          reviews={
            <Suspense fallback={null}>
              <ReviewsSection />
            </Suspense>
          }
        />
      )}

      {sections.statisticsBand && (
        <Suspense fallback={<SkeletonBand className="h-32" />}>
          <StatisticsBand />
        </Suspense>
      )}

      {sections.trustComparison && <TrustComparison />}

      {sections.howItWorks && <HowItWorks />}

      {sections.whySeedhiDeal && <WhySeedhiDeal />}
      {sections.downloadApp && <DownloadApp />}
      {sections.newsletter && <NewsletterSection />}
      {sections.faq && <FaqAccordion />}

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
