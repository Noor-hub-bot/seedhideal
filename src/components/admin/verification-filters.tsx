import { Button, Input, Select } from "@/components/ui";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "action_required", label: "Resubmission requested" },
];
const USER_TYPES = [
  { value: "dealer", label: "Dealer" },
  { value: "individual", label: "Private seller" },
];
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export type VerificationFilterValues = {
  q?: string;
  status?: string;
  userType?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
};

/** Plain GET form — same server-rendered, URL-driven pattern as every other admin
 * filter bar (ListingFilters, UserFilters). */
export function VerificationFilters({ values }: { values: VerificationFilterValues }) {
  return (
    <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <Input type="search" name="q" defaultValue={values.q ?? ""} placeholder="Search by name, email, phone, or user ID" />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Select name="status" defaultValue={values.status ?? ""}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select name="userType" defaultValue={values.userType ?? ""}>
          <option value="">Any seller type</option>
          {USER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Input type="date" name="dateFrom" defaultValue={values.dateFrom ?? ""} aria-label="Submitted from" />
        <Input type="date" name="dateTo" defaultValue={values.dateTo ?? ""} aria-label="Submitted to" />
        <Select name="sort" defaultValue={values.sort ?? "newest"}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="py-2.5">
          Apply filters
        </Button>
        <a href="/admin/verification" className="text-[13px] font-semibold text-muted hover:text-foreground">
          Clear all
        </a>
      </div>
    </form>
  );
}
