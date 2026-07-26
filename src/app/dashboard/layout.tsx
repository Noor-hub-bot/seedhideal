import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, dealerProfiles, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

// Wraps every /dashboard/* route in a shared tab nav. Existing sub-pages
// (favorites, inquiries/[id], support*, verify) each already render their own
// `mx-auto max-w-*` container, so this adds only the nav bar above them —
// not a second competing container — to avoid double-wrapping their layout.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard");

  const [profile, dealerListing] = await Promise.all([
    db.select({ id: dealerProfiles.id }).from(dealerProfiles).where(eq(dealerProfiles.userId, user.id)),
    db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.sellerId, user.id), eq(listings.sellerType, "dealer")))
      .limit(1),
  ]);
  const isDealer = profile.length > 0 || dealerListing.length > 0;

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6">
        <DashboardNav isDealer={isDealer} />
      </div>
      {children}
    </div>
  );
}
