import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getSummaryStats } from "@/lib/admin/stats";
import { getRecentActivity } from "@/lib/admin/activity";
import { getPendingApprovals } from "@/lib/admin/pending-approvals";
import { getUserSummaries } from "@/lib/admin/users";
import {
  getListingsByCity,
  getListingsPerDay,
  getListingStatusDistribution,
  getTopBrands,
  getUsersPerMonth,
} from "@/lib/admin/charts";
import {
  getMarketplaceHealth,
  getMostContactedSellers,
  getMostFavoritedListings,
  getMostViewedListings,
  getSystemStatus,
} from "@/lib/admin/health";
import { CarIcon, StarIcon, UsersIcon } from "@/components/home/icons";
import { BuildingIcon, CheckCircleIcon, ClockIcon, ReceiptIcon, XCircleIcon } from "@/components/admin/icons";
import { StatCard } from "@/components/admin/stat-card";
import { QuickActions } from "@/components/admin/quick-actions";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { PendingApprovalsWidget } from "@/components/admin/pending-approvals-widget";
import { RecentUsersWidget } from "@/components/admin/recent-users-widget";
import { BarChart } from "@/components/admin/bar-chart";
import { DonutChart } from "@/components/admin/donut-chart";
import { RankedBarList } from "@/components/admin/ranked-bar-list";
import { MarketplaceHealth } from "@/components/admin/marketplace-health";
import { SystemStatus } from "@/components/admin/system-status";
import { SectionCard } from "@/components/admin/section-card";
import { SectionSkeleton, StatCardsSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Admin — dashboard" };

const STAT_ICONS: Record<string, typeof CarIcon> = {
  totalListings: CarIcon,
  activeListings: CheckCircleIcon,
  pendingReview: ClockIcon,
  rejectedListings: XCircleIcon,
  soldCars: ReceiptIcon,
  featuredListings: StarIcon,
  totalUsers: UsersIcon,
  dealers: BuildingIcon,
};

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div>
        <h1 className="font-display text-[32px] font-medium leading-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">The control center for the whole marketplace.</p>
      </div>

      <Suspense fallback={<StatCardsSkeleton />}>
        <SummaryCards />
      </Suspense>

      <section>
        <h2 className="mb-4 font-display text-lg font-medium">Quick actions</h2>
        <QuickActions />
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Suspense fallback={<SectionSkeleton />}>
            <RecentActivitySection />
          </Suspense>
        </div>
        <div className="lg:col-span-7">
          <Suspense fallback={<SectionSkeleton />}>
            <PendingApprovalsSection />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<SectionSkeleton />}>
        <RecentUsersSection />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Suspense fallback={<SectionSkeleton />}>
            <ListingsPerDaySection />
          </Suspense>
        </div>
        <div className="lg:col-span-5">
          <Suspense fallback={<SectionSkeleton />}>
            <StatusDistributionSection />
          </Suspense>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Suspense fallback={<SectionSkeleton />}>
            <UsersPerMonthSection />
          </Suspense>
        </div>
        <div className="lg:col-span-4">
          <Suspense fallback={<SectionSkeleton />}>
            <TopBrandsSection />
          </Suspense>
        </div>
        <div className="lg:col-span-4">
          <Suspense fallback={<SectionSkeleton />}>
            <ListingsByCitySection />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<SectionSkeleton />}>
        <MarketplaceHealthSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton height="h-96" />}>
        <PerformanceSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <SystemStatusSection />
      </Suspense>
    </div>
  );
}

async function SummaryCards() {
  const stats = await getSummaryStats();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard
          key={s.key}
          icon={STAT_ICONS[s.key] ?? CarIcon}
          label={s.label}
          value={s.value}
          todayChange={s.todayChange}
          percentChange={s.percentChange}
        />
      ))}
    </div>
  );
}

async function RecentActivitySection() {
  const items = await getRecentActivity(12);
  return (
    <SectionCard title="Recent activity" description="Newest marketplace events first.">
      <ActivityFeed items={items} />
    </SectionCard>
  );
}

async function PendingApprovalsSection() {
  const items = await getPendingApprovals(6);
  return (
    <SectionCard
      title="Pending approvals"
      description="Newest submissions waiting for a decision."
      action={
        <Link href="/admin/moderation" className="text-[13px] font-semibold text-brand hover:text-brand-strong">
          View full queue →
        </Link>
      }
    >
      <PendingApprovalsWidget items={items} />
    </SectionCard>
  );
}

async function RecentUsersSection() {
  const users = await getUserSummaries({ limit: 6 });
  return (
    <SectionCard
      title="Recent users"
      description="Newest accounts on the marketplace."
      action={
        <Link href="/admin/users" className="text-[13px] font-semibold text-brand hover:text-brand-strong">
          View all users →
        </Link>
      }
    >
      <RecentUsersWidget users={users} />
    </SectionCard>
  );
}

async function ListingsPerDaySection() {
  const data = await getListingsPerDay();
  return (
    <SectionCard title="Listings created per day" description="Last 30 days.">
      <BarChart data={data} labelEvery={5} />
    </SectionCard>
  );
}

async function StatusDistributionSection() {
  const data = await getListingStatusDistribution();
  return (
    <SectionCard title="Listing status distribution" description="Every listing, by current status.">
      <DonutChart data={data} />
    </SectionCard>
  );
}

async function UsersPerMonthSection() {
  const data = await getUsersPerMonth();
  return (
    <SectionCard title="Users registered per month" description="Last 12 months.">
      <BarChart data={data} labelEvery={2} height={140} />
    </SectionCard>
  );
}

async function TopBrandsSection() {
  const data = await getTopBrands(8);
  return (
    <SectionCard title="Most popular brands" description="By total listings.">
      <RankedBarList data={data} />
    </SectionCard>
  );
}

async function ListingsByCitySection() {
  const data = await getListingsByCity(8);
  return (
    <SectionCard title="Listings by city" description="Where sellers are listing from.">
      <RankedBarList data={data} />
    </SectionCard>
  );
}

async function MarketplaceHealthSection() {
  const metrics = await getMarketplaceHealth();
  return (
    <SectionCard title="Marketplace health" description="What needs staff attention right now.">
      <MarketplaceHealth metrics={metrics} />
    </SectionCard>
  );
}

async function PerformanceSection() {
  const [mostViewed, mostFavorited, mostContacted, topCities, topBrands] = await Promise.all([
    getMostViewedListings(5),
    getMostFavoritedListings(5),
    getMostContactedSellers(5),
    getListingsByCity(5),
    getTopBrands(5),
  ]);

  return (
    <div>
      <h2 className="mb-4 font-display text-lg font-medium">Performance</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="Most viewed listings" description="All-time view count.">
          <RankedBarList data={mostViewed.map((l) => ({ label: l.title, value: l.value }))} />
        </SectionCard>
        <SectionCard title="Most favorited listings" description="Saved by the most buyers.">
          <RankedBarList data={mostFavorited.map((l) => ({ label: l.title, value: l.value }))} />
        </SectionCard>
        <SectionCard title="Most contacted sellers" description="By inquiry volume.">
          <RankedBarList data={mostContacted.map((s) => ({ label: s.name, value: s.value }))} />
        </SectionCard>
        <SectionCard title="Top cities" description="By total listings.">
          <RankedBarList data={topCities} />
        </SectionCard>
        <SectionCard title="Top brands" description="By total listings.">
          <RankedBarList data={topBrands} />
        </SectionCard>
      </div>
    </div>
  );
}

async function SystemStatusSection() {
  const items = await getSystemStatus();
  return (
    <SectionCard title="System status" description="Live signals, not a static all-green.">
      <SystemStatus items={items} />
    </SectionCard>
  );
}
