import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getUserSummaries } from "@/lib/admin/users";
import { UserTableRow } from "@/components/admin/user-row";
import { EmptyState } from "@/components/admin/section-card";
import { Input, Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui";

export const metadata: Metadata = { title: "Admin — users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !isStaff(user)) redirect("/");

  const { q } = await searchParams;
  const users = await getUserSummaries({ limit: 100, search: q });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-[32px] font-medium leading-tight">Users</h1>
        <p className="mt-1 text-sm text-muted">
          {users.length} user{users.length === 1 ? "" : "s"} {q?.trim() ? `matching "${q.trim()}"` : "on the marketplace"}
        </p>
      </div>

      <form className="max-w-sm">
        <Input type="search" name="q" defaultValue={q ?? ""} placeholder="Search by name, email, or phone" />
      </form>

      {users.length === 0 ? (
        <EmptyState>No users found.</EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead className="text-center">Listings</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <UserTableRow key={u.id} user={u} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
