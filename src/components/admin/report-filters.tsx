import { Button, Input, Select } from "@/components/ui";

const STATUSES = [
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "investigating", label: "Under review" },
  { value: "actioned", label: "Resolved" },
  { value: "appealed", label: "Appealed" },
  { value: "closed", label: "Dismissed" },
];
const PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const REASONS = [
  { value: "fake_listing", label: "Fake listing" },
  { value: "ownership_concern", label: "Ownership concern" },
  { value: "dealer_mislabeling", label: "Dealer mislabeling" },
  { value: "scam_request", label: "Scam request" },
  { value: "harassment", label: "Harassment" },
  { value: "incorrect_condition", label: "Incorrect condition" },
];
const TYPES = [
  { value: "listing", label: "Listing report" },
  { value: "user", label: "User report" },
];
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "priority", label: "Priority" },
];

export type ReportFilterValues = {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
};

/** Plain GET form — same server-rendered, URL-driven pattern as VerificationFilters/
 * ListingFilters/UserFilters. */
export function ReportFilters({ values }: { values: ReportFilterValues }) {
  return (
    <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <Input type="search" name="q" defaultValue={values.q ?? ""} placeholder="Search by report ID, listing ID, user, reporter, email, or phone" />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
        <Select name="status" defaultValue={values.status ?? ""}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select name="priority" defaultValue={values.priority ?? ""}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select name="category" defaultValue={values.category ?? ""}>
          <option value="">Any reason</option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <Select name="type" defaultValue={values.type ?? ""}>
          <option value="">Any type</option>
          {TYPES.map((t) => (
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
        <a href="/admin/reports" className="text-[13px] font-semibold text-muted hover:text-foreground">
          Clear all
        </a>
      </div>
    </form>
  );
}
