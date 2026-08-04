import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getReportsQueue, getReportsQueueCount, getReportStats, type ReportPriority, type ReportSortKey } from "@/lib/admin/reports";
import { ReportsTable } from "@/components/admin/reports-table";
import { ReportFilters } from "@/components/admin/report-filters";
import { MarketplaceHealth } from "@/components/admin/marketplace-health";
import { Pagination } from "@/components/pagination";

export const metadata: Metadata = { title: "Admin — reports center" };

const PAGE_SIZE = 20;
const STATUSES = new Set(["new", "triaged", "investigating", "actioned", "appealed", "closed"]);
const PRIORITIES = new Set<ReportPriority>(["high", "medium", "low"]);
const CATEGORIES = new Set(["fake_listing", "ownership_concern", "dealer_mislabeling", "scam_request", "harassment", "incorrect_condition"]);
const TYPES = new Set(["listing", "user"]);
const SORTS = new Set<ReportSortKey>(["newest", "oldest", "priority"]);

type Search = Partial<Record<"q" | "status" | "priority" | "category" | "type" | "dateFrom" | "dateTo" | "sort" | "page", string>>;

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  const params = await searchParams;
  const filters = {
    search: params.q,
    status: params.status && STATUSES.has(params.status) ? params.status : undefined,
    priority: params.priority && PRIORITIES.has(params.priority as ReportPriority) ? (params.priority as ReportPriority) : undefined,
    category: params.category && CATEGORIES.has(params.category) ? params.category : undefined,
    type: params.type && TYPES.has(params.type) ? (params.type as "listing" | "user") : undefined,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
    sort: params.sort && SORTS.has(params.sort as ReportSortKey) ? (params.sort as ReportSortKey) : undefined,
  };
  const page = Math.max(1, Number(params.page) || 1);

  const [stats, total, reports] = await Promise.all([
    getReportStats(),
    getReportsQueueCount(filters),
    getReportsQueue({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/reports${qs ? `?${qs}` : ""}`;
  };

  const healthMetrics = [
    { key: "total", label: "Total Reports", value: stats.total },
    { key: "open", label: "Open Reports", value: stats.open },
    { key: "underReview", label: "Under Review", value: stats.underReview },
    { key: "resolved", label: "Resolved", value: stats.resolved },
    { key: "dismissed", label: "Dismissed", value: stats.dismissed },
    { key: "reportsToday", label: "Reports Today", value: stats.reportsToday },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-[32px] font-medium leading-tight">Reports Center</h1>
        <p className="mt-1 text-sm text-muted">
          {total} report{total === 1 ? "" : "s"} {params.q?.trim() ? `matching "${params.q.trim()}"` : "on file"}
        </p>
      </div>

      <MarketplaceHealth metrics={healthMetrics} />

      <ReportFilters values={params} />

      <ReportsTable reports={reports} />

      <Pagination page={page} totalPages={totalPages} buildHref={pageHref} />
    </div>
  );
}
