import { Button, Input, Select } from "@/components/ui";
import { CITIES, FUEL_TYPES, MAKES, PROVINCES, TRANSMISSIONS } from "@/lib/constants";

const STATUSES = ["draft", "submitted", "under_review", "correction", "active", "paused", "suspended", "sold", "expired", "closed"];
const VERIFICATIONS = [
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "none", label: "Unverified" },
];
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "views", label: "Most viewed" },
  { value: "favorites", label: "Most favorited" },
];

export type ListingFilterValues = {
  q?: string;
  status?: string;
  verification?: string;
  featured?: string;
  province?: string;
  city?: string;
  make?: string;
  model?: string;
  yearMin?: string;
  yearMax?: string;
  fuel?: string;
  transmission?: string;
  priceMin?: string;
  priceMax?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
};

/** Plain GET form — same server-rendered, URL-driven pattern as UserFilters
 * (src/components/admin/user-filters.tsx) and the public CarFilters, just with the
 * field set this table's columns actually need (status/verification/featured/date
 * range instead of ownership/colors/save-search, which don't apply to an admin view). */
export function ListingFilters({ values, models }: { values: ListingFilterValues; models: string[] }) {
  const exportQuery = new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string] => !!entry[1])).toString();

  return (
    <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <Input
        type="search"
        name="q"
        defaultValue={values.q ?? ""}
        placeholder="Search by listing ID, seller name, phone, email, make, or model"
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Select name="status" defaultValue={values.status ?? ""}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
        <Select name="verification" defaultValue={values.verification ?? ""}>
          <option value="">Any verification</option>
          {VERIFICATIONS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </Select>
        <Select name="featured" defaultValue={values.featured ?? ""}>
          <option value="">Featured: any</option>
          <option value="1">Featured only</option>
          <option value="0">Not featured</option>
        </Select>
        <Select name="province" defaultValue={values.province ?? ""}>
          <option value="">All provinces</option>
          {PROVINCES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
        <Select name="city" defaultValue={values.city ?? ""}>
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select name="make" defaultValue={values.make ?? ""}>
          <option value="">All makes</option>
          {MAKES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
        <Select name="model" defaultValue={values.model ?? ""} disabled={!values.make}>
          <option value="">{values.make ? "All models" : "Select a make first"}</option>
          {models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
        <Select name="fuel" defaultValue={values.fuel ?? ""}>
          <option value="">Any fuel</option>
          {FUEL_TYPES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
        <Select name="transmission" defaultValue={values.transmission ?? ""}>
          <option value="">Any transmission</option>
          {TRANSMISSIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Input type="number" name="yearMin" defaultValue={values.yearMin ?? ""} placeholder="Year from" aria-label="Year from" />
        <Input type="number" name="yearMax" defaultValue={values.yearMax ?? ""} placeholder="Year to" aria-label="Year to" />
        <Select name="sort" defaultValue={values.sort ?? "newest"}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Input type="number" name="priceMin" defaultValue={values.priceMin ?? ""} placeholder="Min PKR" aria-label="Minimum price" />
        <Input type="number" name="priceMax" defaultValue={values.priceMax ?? ""} placeholder="Max PKR" aria-label="Maximum price" />
        <Input type="date" name="dateFrom" defaultValue={values.dateFrom ?? ""} aria-label="Created from" />
        <Input type="date" name="dateTo" defaultValue={values.dateTo ?? ""} aria-label="Created to" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="py-2.5">
          Apply filters
        </Button>
        <a href="/admin/listings" className="text-[13px] font-semibold text-muted hover:text-foreground">
          Clear all
        </a>
        <a
          href={`/api/admin/listings/export${exportQuery ? `?${exportQuery}` : ""}`}
          className="ml-auto text-[13px] font-semibold text-brand hover:text-brand-strong"
        >
          Export current view as CSV →
        </a>
      </div>
    </form>
  );
}
