import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getUserCount, getUserStats, getUserSummaries, type UserAccountStatus, type UserRole, type UserSortKey } from "@/lib/admin/users";
import { UserTableRow } from "@/components/admin/user-row";
import { UserFilters } from "@/components/admin/user-filters";
import { MarketplaceHealth } from "@/components/admin/marketplace-health";
import { EmptyState } from "@/components/admin/section-card";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui";

export const metadata: Metadata = { title: "Admin — users" };

const PAGE_SIZE = 20;
const ROLES = new Set<UserRole>(["user", "reviewer", "moderator", "support", "admin"]);
const STATUSES = new Set<UserAccountStatus>(["active", "restricted", "deactivated"]);
const VERIFICATIONS = new Set(["verified", "pending", "none"]);
const SORTS = new Set<UserSortKey>(["newest", "oldest", "name", "listings"]);

type Search = Partial<Record<"q" | "role" | "status" | "verification" | "sort" | "page", string>>;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  const params = await searchParams;
  const filters = {
    search: params.q,
    role: params.role && ROLES.has(params.role as UserRole) ? (params.role as UserRole) : undefined,
    status: params.status && STATUSES.has(params.status as UserAccountStatus) ? (params.status as UserAccountStatus) : undefined,
    verification: params.verification && VERIFICATIONS.has(params.verification) ? (params.verification as "verified" | "pending" | "none") : undefined,
    sort: params.sort && SORTS.has(params.sort as UserSortKey) ? (params.sort as UserSortKey) : undefined,
  };
  const page = Math.max(1, Number(params.page) || 1);

  const [stats, total, users] = await Promise.all([
    getUserStats(),
    getUserCount(filters),
    getUserSummaries({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  const healthMetrics = [
    { key: "total", label: "Total Users", value: stats.total },
    { key: "active", label: "Active", value: stats.active },
    { key: "restricted", label: "Suspended", value: stats.restricted },
    { key: "deactivated", label: "Deactivated", value: stats.deactivated },
    { key: "verified", label: "Verified", value: stats.verified, caption: "Have a verified case" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-[32px] font-medium leading-tight">Users</h1>
        <p className="mt-1 text-sm text-muted">
          {total} user{total === 1 ? "" : "s"} {params.q?.trim() ? `matching "${params.q.trim()}"` : "on the marketplace"}
        </p>
      </div>

      <MarketplaceHealth metrics={healthMetrics} />

      <UserFilters q={params.q} role={params.role} status={params.status} verification={params.verification} sort={params.sort} />

      {users.length === 0 ? (
        <EmptyState>No users match these filters.</EmptyState>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="text-center">Listings</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <UserTableRow key={u.id} user={u} />
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} buildHref={pageHref} />
        </>
      )}
    </div>
  );
}
