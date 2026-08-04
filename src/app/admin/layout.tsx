import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";

// Wraps every /admin/* route in a shared staff-only nav — same pattern as
// src/app/dashboard/layout.tsx. Sub-pages still re-check isStaff themselves (defense
// in depth, matching the existing dashboard/moderation convention) rather than relying
// on this layout alone.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  return (
    <TooltipProvider>
      <ToastProvider>
        <div>
          <div className="mx-auto max-w-6xl px-6">
            <AdminNav />
          </div>
          {children}
        </div>
      </ToastProvider>
    </TooltipProvider>
  );
}
