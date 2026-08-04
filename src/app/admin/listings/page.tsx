import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import {
  getListingDirectoryCount,
  getListingDirectoryStats,
  getListingModelsForMake,
  getListingSummaries,
  type ListingSortKey,
} from "@/lib/admin/listings";
import { AdminListingsTable } from "@/components/admin/admin-listings-table";
import { ListingFilters } from "@/components/admin/listing-filters";
import { MarketplaceHealth } from "@/components/admin/marketplace-health";
import { Pagination } from "@/components/pagination";

export const metadata: Metadata = { title: "Admin — listings" };

const PAGE_SIZE = 20;
const STATUSES = new Set(["draft", "submitted", "under_review", "correction", "active", "paused", "suspended", "sold", "expired", "closed"]);
const VERIFICATIONS = new Set(["verified", "pending", "none"]);
const FUELS = new Set(["petrol", "diesel", "hybrid", "electric", "cng"]);
const TRANSMISSIONS = new Set(["manual", "automatic"]);
const SORTS = new Set<ListingSortKey>(["newest", "oldest", "price_asc", "price_desc", "views", "favorites"]);

type Search = Partial<
  Record<
    | "q"
    | "status"
    | "verification"
    | "featured"
    | "province"
    | "city"
    | "make"
    | "model"
    | "yearMin"
    | "yearMax"
    | "fuel"
    | "transmission"
    | "priceMin"
    | "priceMax"
    | "dateFrom"
    | "dateTo"
    | "sort"
    | "page",
    string
  >
>;

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  const params = await searchParams;
  const filters = {
    search: params.q,
    status: params.status && STATUSES.has(params.status) ? params.status : undefined,
    verification: params.verification && VERIFICATIONS.has(params.verification) ? (params.verification as "verified" | "pending" | "none") : undefined,
    featured: params.featured === "1" ? true : params.featured === "0" ? false : undefined,
    province: params.province || undefined,
    city: params.city || undefined,
    make: params.make || undefined,
    model: params.model || undefined,
    yearMin: params.yearMin ? Number(params.yearMin) : undefined,
    yearMax: params.yearMax ? Number(params.yearMax) : undefined,
    fuel: params.fuel && FUELS.has(params.fuel) ? params.fuel : undefined,
    transmission: params.transmission && TRANSMISSIONS.has(params.transmission) ? params.transmission : undefined,
    priceMin: params.priceMin ? Number(params.priceMin) : undefined,
    priceMax: params.priceMax ? Number(params.priceMax) : undefined,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
    sort: params.sort && SORTS.has(params.sort as ListingSortKey) ? (params.sort as ListingSortKey) : undefined,
  };
  const page = Math.max(1, Number(params.page) || 1);

  const [stats, total, listings, models] = await Promise.all([
    getListingDirectoryStats(),
    getListingDirectoryCount(filters),
    getListingSummaries({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getListingModelsForMake(params.make ?? ""),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/listings${qs ? `?${qs}` : ""}`;
  };

  const healthMetrics = [
    { key: "total", label: "Total Listings", value: stats.total },
    { key: "active", label: "Active", value: stats.active },
    { key: "pending", label: "Pending Review", value: stats.pending },
    { key: "suspended", label: "Suspended", value: stats.suspended },
    { key: "featured", label: "Featured", value: stats.featured },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-[32px] font-medium leading-tight">Listings</h1>
        <p className="mt-1 text-sm text-muted">
          {total} listing{total === 1 ? "" : "s"} {params.q?.trim() ? `matching "${params.q.trim()}"` : "on the marketplace"}
        </p>
      </div>

      <MarketplaceHealth metrics={healthMetrics} />

      <ListingFilters values={params} models={models} />

      <AdminListingsTable listings={listings} />

      <Pagination page={page} totalPages={totalPages} buildHref={pageHref} />
    </div>
  );
}
