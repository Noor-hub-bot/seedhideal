import { and, asc, count, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db, favorites, listingPhotos, listings, users, verificationCases } from "@/db";
import { citiesInProvince } from "@/lib/search-params";

export type ListingSummary = {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  photoUrl: string | null;
  sellerId: string;
  sellerName: string | null;
  sellerPhone: string | null;
  sellerEmail: string | null;
  city: string;
  price: number;
  status: string;
  featured: boolean;
  viewCount: number;
  favoritesCount: number;
  createdAt: Date;
  verificationStatus: "verified" | "pending" | "none";
};

export type ListingSortKey = "newest" | "oldest" | "price_asc" | "price_desc" | "views" | "favorites";

export type ListingDirectoryFilters = {
  search?: string;
  /** Restrict to exactly these listing ids — used by the CSV export route when
   * exporting a bulk-selected set rather than "everything matching the current
   * filters." Combines with the other filters (all are AND'd together). */
  ids?: string[];
  status?: string;
  featured?: boolean;
  province?: string;
  city?: string;
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  fuel?: string;
  transmission?: string;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  verification?: "verified" | "pending" | "none";
  sort?: ListingSortKey;
};

/** Real-column conditions only (verification/favorites are derived from other tables,
 * handled after the query — same split as src/lib/admin/users.ts). Search spans both
 * listings columns (id prefix, make, model) and the joined seller's name/phone/email —
 * a real UUID/text search across the same join every row already needs for seller info,
 * not a second query. There's no registration-number column in this schema (only
 * registrationCity), so that field isn't searchable — nothing to fake here. */
function baseCondition(filters: ListingDirectoryFilters): SQL | undefined {
  const clauses: SQL[] = [];

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    const like = `%${term}%`;
    const searchClauses = [
      ilike(users.displayName, like),
      ilike(users.email, like),
      ilike(users.phone, like),
      ilike(listings.make, like),
      ilike(listings.model, like),
    ];
    // A listing id is a UUID — only try matching it as one when the search term looks
    // like (a prefix of) one, so a plain text search never has to pay for/trip over an
    // invalid-UUID comparison.
    if (/^[0-9a-f-]+$/i.test(term)) {
      searchClauses.push(sql`${listings.id}::text ilike ${like}`);
    }
    const combined = or(...searchClauses);
    if (combined) clauses.push(combined);
  }

  if (filters.ids) clauses.push(inArray(listings.id, filters.ids));
  if (filters.status) clauses.push(eq(listings.status, filters.status as (typeof listings.status.enumValues)[number]));
  if (filters.featured !== undefined) clauses.push(eq(listings.featured, filters.featured));
  if (filters.city) clauses.push(eq(listings.city, filters.city));
  if (filters.province) {
    const cities = citiesInProvince(filters.province);
    if (cities.length) clauses.push(inArray(listings.city, cities));
  }
  if (filters.make) clauses.push(eq(listings.make, filters.make));
  if (filters.model) clauses.push(eq(listings.model, filters.model));
  if (filters.yearMin !== undefined) clauses.push(gte(listings.year, filters.yearMin));
  if (filters.yearMax !== undefined) clauses.push(lte(listings.year, filters.yearMax));
  if (filters.fuel) clauses.push(eq(listings.fuel, filters.fuel as (typeof listings.fuel.enumValues)[number]));
  if (filters.transmission) clauses.push(eq(listings.transmission, filters.transmission as "manual" | "automatic"));
  if (filters.priceMin !== undefined) clauses.push(gte(listings.askingPricePkr, filters.priceMin));
  if (filters.priceMax !== undefined) clauses.push(lte(listings.askingPricePkr, filters.priceMax));
  if (filters.dateFrom) clauses.push(gte(listings.createdAt, filters.dateFrom));
  if (filters.dateTo) clauses.push(lte(listings.createdAt, filters.dateTo));

  return clauses.length ? and(...clauses) : undefined;
}

async function loadDirectory(filters: ListingDirectoryFilters): Promise<ListingSummary[]> {
  const rows = await db
    .select({
      id: listings.id,
      make: listings.make,
      model: listings.model,
      variant: listings.variant,
      year: listings.year,
      sellerId: listings.sellerId,
      sellerName: users.displayName,
      sellerPhone: users.phone,
      sellerEmail: users.email,
      city: listings.city,
      price: listings.askingPricePkr,
      status: listings.status,
      featured: listings.featured,
      viewCount: listings.viewCount,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .innerJoin(users, eq(listings.sellerId, users.id))
    .where(baseCondition(filters));

  if (rows.length === 0) return [];
  const listingIds = rows.map((r) => r.id);
  const sellerIds = [...new Set(rows.map((r) => r.sellerId))];

  const [photoRows, favoriteRows, verificationRows] = await Promise.all([
    db
      .select({ listingId: listingPhotos.listingId, storageKey: listingPhotos.storageKey })
      .from(listingPhotos)
      .where(inArray(listingPhotos.listingId, listingIds))
      .orderBy(asc(listingPhotos.sortOrder)),
    db
      .select({ listingId: favorites.listingId, total: count() })
      .from(favorites)
      .where(inArray(favorites.listingId, listingIds))
      .groupBy(favorites.listingId),
    db
      .select({ userId: verificationCases.userId, status: verificationCases.status })
      .from(verificationCases)
      .where(inArray(verificationCases.userId, sellerIds)),
  ]);

  const photoByListing = new Map<string, string>();
  for (const p of photoRows) if (!photoByListing.has(p.listingId)) photoByListing.set(p.listingId, p.storageKey);

  const favoritesByListing = new Map(favoriteRows.map((r) => [r.listingId, r.total]));

  const verificationBySeller = new Map<string, "verified" | "pending" | "none">();
  for (const v of verificationRows) {
    const current = verificationBySeller.get(v.userId) ?? "none";
    if (v.status === "verified") verificationBySeller.set(v.userId, "verified");
    else if (v.status === "pending" && current !== "verified") verificationBySeller.set(v.userId, "pending");
  }

  let combined: ListingSummary[] = rows.map((r) => ({
    id: r.id,
    title: `${r.make} ${r.model}${r.variant ? ` ${r.variant}` : ""}, ${r.year}`,
    make: r.make,
    model: r.model,
    year: r.year,
    photoUrl: photoByListing.get(r.id) ?? null,
    sellerId: r.sellerId,
    sellerName: r.sellerName,
    sellerPhone: r.sellerPhone,
    sellerEmail: r.sellerEmail,
    city: r.city,
    price: r.price,
    status: r.status,
    featured: r.featured,
    viewCount: r.viewCount,
    favoritesCount: favoritesByListing.get(r.id) ?? 0,
    createdAt: r.createdAt,
    verificationStatus: verificationBySeller.get(r.sellerId) ?? "none",
  }));

  if (filters.verification) combined = combined.filter((l) => l.verificationStatus === filters.verification);

  combined.sort((a, b) => {
    switch (filters.sort) {
      case "oldest":
        return a.createdAt.getTime() - b.createdAt.getTime();
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "views":
        return b.viewCount - a.viewCount;
      case "favorites":
        return b.favoritesCount - a.favoritesCount;
      case "newest":
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  return combined;
}

export async function getListingSummaries(
  opts: { limit?: number; offset?: number } & ListingDirectoryFilters = {},
): Promise<ListingSummary[]> {
  const { limit = 20, offset = 0, ...filters } = opts;
  const all = await loadDirectory(filters);
  return all.slice(offset, offset + limit);
}

export async function getListingDirectoryCount(filters: ListingDirectoryFilters = {}): Promise<number> {
  const all = await loadDirectory(filters);
  return all.length;
}

export async function getListingDirectoryStats(): Promise<{
  total: number;
  active: number;
  pending: number;
  suspended: number;
  featured: number;
}> {
  const [[totalRow], [activeRow], [pendingRow], [suspendedRow], [featuredRow]] = await Promise.all([
    db.select({ n: count() }).from(listings),
    db.select({ n: count() }).from(listings).where(eq(listings.status, "active")),
    db.select({ n: count() }).from(listings).where(inArray(listings.status, ["submitted", "under_review"])),
    db.select({ n: count() }).from(listings).where(eq(listings.status, "suspended")),
    db.select({ n: count() }).from(listings).where(eq(listings.featured, true)),
  ]);
  return {
    total: totalRow.n,
    active: activeRow.n,
    pending: pendingRow.n,
    suspended: suspendedRow.n,
    featured: featuredRow.n,
  };
}

export async function getListingModelsForMake(make: string): Promise<string[]> {
  if (!make) return [];
  const rows = await db.selectDistinct({ model: listings.model }).from(listings).where(eq(listings.make, make)).orderBy(asc(listings.model));
  return rows.map((r) => r.model);
}
