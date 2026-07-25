import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNull, lte, or } from "drizzle-orm";
import { db, listings, verificationCases } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { Card, Heading } from "@/components/ui";
import { CarFilters, type FilterValues } from "@/components/car-filters";
import { Pagination } from "@/components/pagination";
import {
  ASSEMBLY_OPTIONS,
  BODY_TYPES,
  CITIES,
  COLORS,
  FUEL_TYPES,
  MAKES,
  PAGE_SIZE,
  PROVINCES,
  SELLER_TYPES,
  SORT_OPTIONS,
  TRANSMISSIONS,
} from "@/lib/constants";
import { citiesInProvince, isOwnershipBucket, parseIntParam, parseYearParam } from "@/lib/search-params";

type Search = Partial<Record<
  | "q" | "city" | "make" | "model" | "variant" | "registrationCity" | "province"
  | "priceMin" | "priceMax" | "yearMin" | "yearMax" | "mileageMax" | "fuel" | "transmission"
  | "engineMin" | "engineMax" | "bodyType" | "exteriorColor" | "interiorColor" | "assembly"
  | "ownershipType" | "sellerType" | "verified" | "featured" | "sort" | "layout" | "page",
  string
>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const params = await searchParams;
  const bits = [params.make, params.model, params.city && `in ${params.city}`].filter(Boolean);
  const title = bits.length ? `${bits.join(" ")} cars for sale` : "Browse verified cars";
  return { title };
}

// Human-readable labels for the active-filter chip row.
function filterLabel(key: string, value: string): string {
  const lookups: Record<string, Record<string, string>> = {
    fuel: Object.fromEntries(FUEL_TYPES.map((f) => [f.value, f.label])),
    transmission: Object.fromEntries(TRANSMISSIONS.map((t) => [t.value, t.label])),
    assembly: Object.fromEntries(ASSEMBLY_OPTIONS.map((a) => [a.value, a.label])),
    sellerType: Object.fromEntries(SELLER_TYPES.map((s) => [s.value, s.label])),
    ownershipType: { first: "1st owner", second: "2nd owner", third_plus: "3rd+ owner" },
  };
  if (key === "priceMin") return `Min PKR ${Number(value).toLocaleString("en-PK")}`;
  if (key === "priceMax") return `Max PKR ${Number(value).toLocaleString("en-PK")}`;
  if (key === "yearMin") return `From ${value}`;
  if (key === "yearMax") return `To ${value}`;
  if (key === "mileageMax") return `Up to ${Number(value).toLocaleString("en-PK")} km`;
  if (key === "engineMin") return `Min ${value}cc`;
  if (key === "engineMax") return `Max ${value}cc`;
  if (key === "registrationCity") return `Registered: ${value}`;
  if (key === "verified") return "Verified only";
  if (key === "featured") return "Featured only";
  return lookups[key]?.[value] ?? value;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const layout = params.layout === "list" ? "list" : "grid";

  // Exact-match filters only (SRC-07). Excludes listings past expiresAt even if the
  // /api/cron/sweep-listings job hasn't flipped their status to "expired" yet.
  const conditions = [
    eq(listings.status, "active" as const),
    or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
  ];
  if (params.city && CITIES.includes(params.city))
    conditions.push(eq(listings.city, params.city));
  if (params.make && MAKES.includes(params.make))
    conditions.push(eq(listings.make, params.make));
  if (params.transmission === "automatic" || params.transmission === "manual")
    conditions.push(eq(listings.transmission, params.transmission));
  if (params.priceMax && /^\d+$/.test(params.priceMax))
    conditions.push(lte(listings.askingPricePkr, Number(params.priceMax)));
  if (params.q?.trim()) {
    const q = `%${params.q.trim()}%`;
    const yearNum = Number(params.q.trim());
    const textMatch = or(
      ilike(listings.make, q),
      ilike(listings.model, q),
      ilike(listings.variant, q),
    );
    conditions.push(
      Number.isInteger(yearNum) && yearNum > 1900
        ? (or(textMatch, and(gte(listings.year, yearNum), lte(listings.year, yearNum)))!)
        : textMatch!,
    );
  }

  const priceMin = parseIntParam(params.priceMin);
  if (priceMin !== undefined) conditions.push(gte(listings.askingPricePkr, priceMin));

  const yearMin = parseYearParam(params.yearMin);
  if (yearMin !== undefined) conditions.push(gte(listings.year, yearMin));
  const yearMax = parseYearParam(params.yearMax);
  if (yearMax !== undefined) conditions.push(lte(listings.year, yearMax));

  const mileageMax = parseIntParam(params.mileageMax);
  if (mileageMax !== undefined) conditions.push(lte(listings.mileageKm, mileageMax));

  if (params.fuel && FUEL_TYPES.some((f) => f.value === params.fuel))
    conditions.push(eq(listings.fuel, params.fuel as (typeof FUEL_TYPES)[number]["value"]));

  const engineMin = parseIntParam(params.engineMin);
  if (engineMin !== undefined) conditions.push(gte(listings.engineCc, engineMin));
  const engineMax = parseIntParam(params.engineMax);
  if (engineMax !== undefined) conditions.push(lte(listings.engineCc, engineMax));

  if (params.bodyType && BODY_TYPES.includes(params.bodyType))
    conditions.push(eq(listings.bodyType, params.bodyType));
  if (params.exteriorColor && COLORS.includes(params.exteriorColor))
    conditions.push(eq(listings.exteriorColor, params.exteriorColor));
  if (params.interiorColor && COLORS.includes(params.interiorColor))
    conditions.push(eq(listings.interiorColor, params.interiorColor));
  if (params.assembly && ASSEMBLY_OPTIONS.some((a) => a.value === params.assembly))
    conditions.push(eq(listings.assembly, params.assembly as "local" | "imported"));
  if (params.registrationCity && CITIES.includes(params.registrationCity))
    conditions.push(eq(listings.registrationCity, params.registrationCity));
  if (params.province && PROVINCES.includes(params.province)) {
    const provinceCities = citiesInProvince(params.province);
    conditions.push(inArray(listings.city, provinceCities));
  }
  if (isOwnershipBucket(params.ownershipType)) {
    if (params.ownershipType === "first") conditions.push(eq(listings.ownershipCount, 1));
    else if (params.ownershipType === "second") conditions.push(eq(listings.ownershipCount, 2));
    else conditions.push(gte(listings.ownershipCount, 3));
  }
  if (params.sellerType && SELLER_TYPES.some((s) => s.value === params.sellerType))
    conditions.push(eq(listings.sellerType, params.sellerType as "individual" | "dealer"));
  if (params.featured === "1") conditions.push(eq(listings.featured, true));

  // Independent lookups needed before the final `where` can be built — run
  // concurrently rather than one-at-a-time (each is a separate network round
  // trip to the DB). Cascading Model/Variant options are derived from real
  // listing data rather than a hand-maintained catalog.
  const wantModels = !!(params.make && MAKES.includes(params.make));
  const wantVariants = !!(params.make && params.model);
  const wantVerifiedIds = params.verified === "1";

  const [modelRows, variantRows, verifiedIdRows, viewer] = await Promise.all([
    wantModels
      ? db
          .selectDistinct({ model: listings.model })
          .from(listings)
          .where(and(eq(listings.status, "active"), eq(listings.make, params.make!)))
          .orderBy(asc(listings.model))
      : Promise.resolve([]),
    wantVariants
      ? db
          .selectDistinct({ variant: listings.variant })
          .from(listings)
          .where(
            and(
              eq(listings.status, "active"),
              eq(listings.make, params.make!),
              eq(listings.model, params.model!),
            ),
          )
          .orderBy(asc(listings.variant))
      : Promise.resolve([]),
    wantVerifiedIds
      ? db.select({ userId: verificationCases.userId }).from(verificationCases).where(eq(verificationCases.status, "verified"))
      : Promise.resolve([]),
    getSessionUser(),
  ]);

  const models = modelRows.map((r) => r.model);
  if (params.model && models.includes(params.model)) conditions.push(eq(listings.model, params.model));

  const variants = variantRows.map((r) => r.variant).filter((v): v is string => !!v);
  if (params.variant && variants.includes(params.variant)) conditions.push(eq(listings.variant, params.variant));

  // Verified-only needs the seller id set resolved up front so it can gate the
  // main query, unlike the badge lookup below (which only needs it for the page
  // of results already fetched).
  let noResults = false;
  if (wantVerifiedIds) {
    const ids = [...new Set(verifiedIdRows.map((r) => r.userId))];
    if (ids.length === 0) noResults = true;
    else conditions.push(inArray(listings.sellerId, ids));
  }

  const where = and(...conditions);
  const page = Math.max(1, parseIntParam(params.page) ?? 1);

  // "featured" (default) ranks currently-boosted listings first via the
  // fast-read featured/featuredPriority cache on `listings` — no join against
  // listingBoosts needed on every page load.
  const sort = SORT_OPTIONS.some((s) => s.value === params.sort) ? params.sort : "featured";
  const orderBy =
    sort === "price_asc"
      ? [asc(listings.askingPricePkr)]
      : sort === "price_desc"
        ? [desc(listings.askingPricePkr)]
        : sort === "newest"
          ? [desc(listings.approvedAt)]
          : [desc(listings.featured), desc(listings.featuredPriority), desc(listings.approvedAt)];

  const [totalRows, results] = noResults
    ? [[{ total: 0 }], []]
    : await Promise.all([
        db.select({ total: count() }).from(listings).where(where),
        db
          .select()
          .from(listings)
          .where(where)
          .orderBy(...orderBy)
          .limit(PAGE_SIZE)
          .offset((page - 1) * PAGE_SIZE),
      ]);
  const total = totalRows[0].total;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const { verifiedSellers, photoByListing, favoritedSet } = await enrichListings(results, viewer);

  const layoutHref = (l: "grid" | "list") => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "layout") sp.set(k, v);
    if (l === "list") sp.set("layout", "list");
    const qs = sp.toString();
    return `/cars${qs ? `?${qs}` : ""}`;
  };

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/cars${qs ? `?${qs}` : ""}`;
  };

  const chipRemoveHref = (key: string) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== key && k !== "page") sp.set(k, v);
    const qs = sp.toString();
    return `/cars${qs ? `?${qs}` : ""}`;
  };

  const activeChips = Object.entries(params).filter(
    ([k, v]) => v && !["layout", "page", "q", "sort"].includes(k),
  ) as [string, string][];

  const filterValues: FilterValues = { ...params };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Heading size="lg" className="mb-1.5">
        Browse verified cars
      </Heading>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted">
          {total} verified private-owner{" "}
          {total === 1 ? "listing matches" : "listings match"} your search
        </p>
        <div className="flex gap-2 rounded-input border border-border p-1">
          {(["grid", "list"] as const).map((l) => (
            <Link
              key={l}
              href={layoutHref(l)}
              className={`rounded-[6px] px-4 py-2 text-[13px] font-semibold capitalize ${
                layout === l ? "bg-brand text-white" : "bg-surface text-muted"
              }`}
            >
              {l}
            </Link>
          ))}
        </div>
      </div>

      <div className="gap-8 lg:flex lg:items-start">
        <div className="mb-6 lg:sticky lg:top-24 lg:mb-0">
          <CarFilters values={filterValues} models={models} variants={variants} layout={layout} />
        </div>

        <div className="min-w-0 flex-1">
          {activeChips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {activeChips.map(([k, v]) => (
                <Link
                  key={k}
                  href={chipRemoveHref(k)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-chip px-3 py-1.5 text-[13px] font-semibold text-muted hover:text-foreground"
                >
                  {filterLabel(k, v)}
                  <span aria-hidden="true">✕</span>
                </Link>
              ))}
              <Link
                href="/cars"
                className="text-[13px] font-semibold text-muted hover:text-foreground"
              >
                Clear all
              </Link>
            </div>
          )}

          {results.length === 0 ? (
            <Card className="p-16 text-center">
              <Heading as="h2" size="md" className="mb-2">
                No listings match those filters
              </Heading>
              <p className="text-sm text-muted">
                Try widening your price range or clearing filters.
              </p>
            </Card>
          ) : layout === "list" ? (
            <div className="flex flex-col gap-4">
              {results.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  layout="list"
                  sellerVerified={verifiedSellers.has(l.sellerId)}
                  photoUrl={photoByListing.get(l.id)}
                  favorited={favoritedSet.has(l.id)}
                  signedIn={!!viewer}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  sellerVerified={verifiedSellers.has(l.sellerId)}
                  photoUrl={photoByListing.get(l.id)}
                  favorited={favoritedSet.has(l.id)}
                  signedIn={!!viewer}
                />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} buildHref={pageHref} />
        </div>
      </div>
    </div>
  );
}
