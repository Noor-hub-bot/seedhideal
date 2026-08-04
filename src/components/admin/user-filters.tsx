import { Button, Input, Select } from "@/components/ui";

const ROLES = ["user", "reviewer", "moderator", "support", "admin"];
const STATUSES = ["active", "restricted", "deactivated"];
const VERIFICATIONS = [
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "none", label: "Unverified" },
];
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "listings", label: "Most listings" },
];

/** Plain GET form — search/filter/sort state lives entirely in the URL, so this stays
 * a server-rendered page with no client JS needed for the filtering itself (only the
 * per-row actions below need to be client components). */
export function UserFilters({
  q,
  role,
  status,
  verification,
  sort,
}: {
  q?: string;
  role?: string;
  status?: string;
  verification?: string;
  sort?: string;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <Input type="search" name="q" defaultValue={q ?? ""} placeholder="Search by name, email, or phone" />
      </div>
      <Select name="role" defaultValue={role ?? ""} className="py-3">
        <option value="">All roles</option>
        {ROLES.map((r) => (
          <option key={r} value={r} className="capitalize">
            {r}
          </option>
        ))}
      </Select>
      <Select name="status" defaultValue={status ?? ""} className="py-3">
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">
            {s}
          </option>
        ))}
      </Select>
      <Select name="verification" defaultValue={verification ?? ""} className="py-3">
        <option value="">Any verification</option>
        {VERIFICATIONS.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </Select>
      <Select name="sort" defaultValue={sort ?? "newest"} className="py-3">
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      <Button type="submit" className="py-3">
        Apply
      </Button>
    </form>
  );
}
