import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import {
  getVerificationQueue,
  getVerificationQueueCount,
  getVerificationStats,
  type VerificationSortKey,
} from "@/lib/admin/verification";
import { VerificationTable } from "@/components/admin/verification-table";
import { VerificationFilters } from "@/components/admin/verification-filters";
import { MarketplaceHealth } from "@/components/admin/marketplace-health";
import { Pagination } from "@/components/pagination";

export const metadata: Metadata = { title: "Admin — verification center" };

const PAGE_SIZE = 20;
const STATUSES = new Set(["pending", "verified", "rejected", "action_required", "expired", "suspended"]);
const USER_TYPES = new Set(["dealer", "individual"]);
const SORTS = new Set<VerificationSortKey>(["newest", "oldest"]);

type Search = Partial<Record<"q" | "status" | "userType" | "dateFrom" | "dateTo" | "sort" | "page", string>>;

export default async function AdminVerificationPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  const params = await searchParams;
  const filters = {
    search: params.q,
    status: params.status && STATUSES.has(params.status) ? params.status : undefined,
    userType: params.userType && USER_TYPES.has(params.userType) ? (params.userType as "dealer" | "individual") : undefined,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
    sort: params.sort && SORTS.has(params.sort as VerificationSortKey) ? (params.sort as VerificationSortKey) : undefined,
  };
  const page = Math.max(1, Number(params.page) || 1);

  const [stats, total, cases] = await Promise.all([
    getVerificationStats(),
    getVerificationQueueCount(filters),
    getVerificationQueue({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/verification${qs ? `?${qs}` : ""}`;
  };

  const healthMetrics = [
    { key: "pending", label: "Pending Requests", value: stats.pending },
    { key: "approvedToday", label: "Approved Today", value: stats.approvedToday },
    { key: "rejectedToday", label: "Rejected Today", value: stats.rejectedToday },
    { key: "totalVerifiedUsers", label: "Total Verified Users", value: stats.totalVerifiedUsers },
    { key: "totalVerifiedDealers", label: "Total Verified Dealers", value: stats.totalVerifiedDealers },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-[32px] font-medium leading-tight">Verification Center</h1>
        <p className="mt-1 text-sm text-muted">
          {total} request{total === 1 ? "" : "s"} {params.q?.trim() ? `matching "${params.q.trim()}"` : "on file"}
        </p>
      </div>

      <MarketplaceHealth metrics={healthMetrics} />

      <VerificationFilters values={params} />

      <VerificationTable cases={cases} />

      <Pagination page={page} totalPages={totalPages} buildHref={pageHref} />
    </div>
  );
}
