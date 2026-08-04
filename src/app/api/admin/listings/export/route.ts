import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getListingSummaries, type ListingDirectoryFilters, type ListingSortKey } from "@/lib/admin/listings";
import { formatDate } from "@/lib/format";

const STATUSES = new Set(["draft", "submitted", "under_review", "correction", "active", "paused", "suspended", "sold", "expired", "closed"]);
const VERIFICATIONS = new Set(["verified", "pending", "none"]);
const SORTS = new Set<ListingSortKey>(["newest", "oldest", "price_asc", "price_desc", "views", "favorites"]);

const CSV_HEADER = [
  "Listing ID",
  "Title",
  "Status",
  "Seller Name",
  "Seller Phone",
  "Seller Email",
  "Verification",
  "City",
  "Price PKR",
  "Featured",
  "Views",
  "Favorites",
  "Created",
];

/** Quotes a field per RFC 4180 whenever it contains a comma, quote, or newline —
 * every value here is real user/listing data (names, cities), which can legitimately
 * contain commas, so this can't be skipped. */
function csvField(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Exports either exactly the listings named by `ids` (bulk-selection export) or every
 * listing matching the same filters the /admin/listings table itself uses (export
 * current view) — same query function (getListingSummaries) either way, just with a
 * high enough limit to return everything instead of one page. Real data only: every
 * column here is read straight from the database, nothing synthesized for the file. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const params = url.searchParams;

  const idsParam = params.get("ids");
  const filters: ListingDirectoryFilters = idsParam
    ? { ids: idsParam.split(",").map((s) => s.trim()).filter(Boolean) }
    : {
        search: params.get("q") ?? undefined,
        status: params.get("status") && STATUSES.has(params.get("status")!) ? params.get("status")! : undefined,
        verification: params.get("verification") && VERIFICATIONS.has(params.get("verification")!) ? (params.get("verification") as "verified" | "pending" | "none") : undefined,
        featured: params.get("featured") === "1" ? true : params.get("featured") === "0" ? false : undefined,
        province: params.get("province") ?? undefined,
        city: params.get("city") ?? undefined,
        make: params.get("make") ?? undefined,
        model: params.get("model") ?? undefined,
        yearMin: params.get("yearMin") ? Number(params.get("yearMin")) : undefined,
        yearMax: params.get("yearMax") ? Number(params.get("yearMax")) : undefined,
        fuel: params.get("fuel") ?? undefined,
        transmission: params.get("transmission") ?? undefined,
        priceMin: params.get("priceMin") ? Number(params.get("priceMin")) : undefined,
        priceMax: params.get("priceMax") ? Number(params.get("priceMax")) : undefined,
        dateFrom: params.get("dateFrom") ? new Date(params.get("dateFrom")!) : undefined,
        dateTo: params.get("dateTo") ? new Date(params.get("dateTo")!) : undefined,
        sort: params.get("sort") && SORTS.has(params.get("sort") as ListingSortKey) ? (params.get("sort") as ListingSortKey) : undefined,
      };

  const rows = await getListingSummaries({ ...filters, limit: 100_000 });

  const lines = [CSV_HEADER.map(csvField).join(",")];
  for (const l of rows) {
    lines.push(
      [
        l.id,
        l.title,
        l.status,
        l.sellerName ?? "",
        l.sellerPhone ?? "",
        l.sellerEmail ?? "",
        l.verificationStatus,
        l.city,
        l.price,
        l.featured ? "Yes" : "No",
        l.viewCount,
        l.favoritesCount,
        formatDate(l.createdAt),
      ]
        .map(csvField)
        .join(","),
    );
  }

  const csv = lines.join("\r\n");
  const filename = `listings-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
