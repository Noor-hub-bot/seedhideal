// The subset of /cars browse-page filter logic (src/app/cars/page.tsx) that's also
// exactly what the AI assistant's car-search tool needs — extracted here so both call
// the identical real query instead of the assistant re-implementing its own version.
// /cars/page.tsx layers its own additional filters (model/variant cascades, province,
// color, assembly, ownership bucket, seller type, verified/featured-only, registration
// city) on top of what this returns; this is not a full replacement for that page's
// filter set, only the fields both consumers genuinely share.
import { and, asc, desc, eq, gt, gte, ilike, isNull, lte, or, type SQL } from "drizzle-orm";
import { db, listings } from "@/db";
import { BODY_TYPES, CITIES, FUEL_TYPES, MAKES } from "@/lib/constants";

export type ListingSearchFilters = {
  /** Free text — matches make/model/variant, or a 4-digit year (same "Corolla 2022"
   * matching the browse page's own main search box already does). */
  q?: string;
  city?: string;
  make?: string;
  transmission?: "manual" | "automatic";
  fuel?: string;
  bodyType?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
};

export function buildListingSearchConditions(filters: ListingSearchFilters): SQL[] {
  const conditions: SQL[] = [
    eq(listings.status, "active" as const),
    or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
  ];

  if (filters.city && CITIES.includes(filters.city)) conditions.push(eq(listings.city, filters.city));
  if (filters.make && MAKES.includes(filters.make)) conditions.push(eq(listings.make, filters.make));
  if (filters.transmission === "automatic" || filters.transmission === "manual")
    conditions.push(eq(listings.transmission, filters.transmission));
  if (filters.fuel && FUEL_TYPES.some((f) => f.value === filters.fuel))
    conditions.push(eq(listings.fuel, filters.fuel as (typeof FUEL_TYPES)[number]["value"]));
  if (filters.bodyType && BODY_TYPES.includes(filters.bodyType)) conditions.push(eq(listings.bodyType, filters.bodyType));
  if (filters.priceMin !== undefined) conditions.push(gte(listings.askingPricePkr, filters.priceMin));
  if (filters.priceMax !== undefined) conditions.push(lte(listings.askingPricePkr, filters.priceMax));
  if (filters.yearMin !== undefined) conditions.push(gte(listings.year, filters.yearMin));
  if (filters.yearMax !== undefined) conditions.push(lte(listings.year, filters.yearMax));

  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    const yearNum = Number(filters.q.trim());
    const textMatch = or(ilike(listings.make, q), ilike(listings.model, q), ilike(listings.variant, q));
    conditions.push(
      Number.isInteger(yearNum) && yearNum > 1900
        ? (or(textMatch, and(gte(listings.year, yearNum), lte(listings.year, yearNum)))!)
        : textMatch!,
    );
  }

  return conditions;
}

/** Real, live query — same table, same "active + not expired" gate, same ranking
 * (featured first, then newest) as the browse page's default sort. Used directly by the
 * AI assistant's search/recommend/compare tools; not a mock, not fixture data. */
export async function searchListings(filters: ListingSearchFilters, limit = 6) {
  const where = and(...buildListingSearchConditions(filters));
  return db
    .select()
    .from(listings)
    .where(where)
    .orderBy(desc(listings.featured), desc(listings.featuredPriority), desc(listings.approvedAt))
    .limit(limit);
}

// Re-exported so callers building a full condition set (e.g. /cars/page.tsx layering
// its own extra filters on top) don't need a second import for basic ordering helpers.
export { asc, desc };
