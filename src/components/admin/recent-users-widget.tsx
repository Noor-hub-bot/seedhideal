import type { UserSummary } from "@/lib/admin/users";
import { UserRow } from "./user-row";
import { EmptyState } from "./section-card";

export function RecentUsersWidget({ users }: { users: UserSummary[] }) {
  if (users.length === 0) return <EmptyState>No users yet.</EmptyState>;
  return (
    <div className="space-y-3">
      {users.map((u) => (
        <UserRow key={u.id} user={u} />
      ))}
    </div>
  );
}
