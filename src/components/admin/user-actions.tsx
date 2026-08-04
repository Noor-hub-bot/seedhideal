"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Badge, Button, Select } from "@/components/ui";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import {
  activateUserAction,
  changeUserRoleAction,
  deleteUserAction,
  suspendUserAction,
  verifyUserAction,
  type UserActionResult,
} from "@/lib/actions/admin-users";
import type { UserSummary } from "@/lib/admin/users";

const STATUS_BADGE: Record<string, { tone: "verified" | "review" | "neutral"; label: string }> = {
  active: { tone: "verified", label: "Active" },
  restricted: { tone: "review", label: "Suspended" },
  deactivated: { tone: "neutral", label: "Deactivated" },
};

const ROLE_OPTIONS = ["user", "reviewer", "moderator", "support", "admin"] as const;

/** The full set of user-management actions (status, role, verify) — used by both the
 * /admin/users table row and the /admin/users/[id] detail page, so suspend/activate/
 * delete/verify/change-role logic exists in exactly one place. Every mutation goes
 * through startTransition (loading state), useOptimistic (instant UI feedback that
 * reverts automatically on failure), and a toast for the final result. */
export function AdminUserActions({ user }: { user: UserSummary }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [optimisticStatus, setOptimisticStatus] = useOptimistic(user.status);
  const [optimisticRole, setOptimisticRole] = useOptimistic(user.role);

  function handleResult(result: UserActionResult) {
    if (result.ok) showToast({ title: "Done", description: result.message, variant: "success" });
    else showToast({ title: "Action failed", description: result.error, variant: "error" });
  }

  function runStatusAction(action: () => Promise<UserActionResult>, nextStatus: string) {
    startTransition(async () => {
      setOptimisticStatus(nextStatus);
      handleResult(await action());
    });
  }

  function handleRoleChange(role: string) {
    startTransition(async () => {
      setOptimisticRole(role);
      handleResult(await changeUserRoleAction(user.id, role));
    });
  }

  function handleVerify() {
    if (!user.pendingVerificationCaseId) return;
    startTransition(async () => {
      handleResult(await verifyUserAction(user.pendingVerificationCaseId!));
    });
  }

  const statusBadge = STATUS_BADGE[optimisticStatus] ?? { tone: "neutral" as const, label: optimisticStatus };
  const displayName = user.displayName ?? user.email ?? "this user";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={statusBadge.tone} className="px-2.5 py-1 text-[11px]">
        {statusBadge.label}
      </Badge>

      <Select
        value={optimisticRole}
        disabled={isPending}
        onChange={(e) => handleRoleChange(e.target.value)}
        className="py-1.5 text-[12px]"
        aria-label={`Change role for ${displayName}`}
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>

      {user.pendingVerificationCaseId && (
        <Button type="button" disabled={isPending} onClick={handleVerify} className="px-3 py-1.5 text-[12px]">
          Verify
        </Button>
      )}

      {optimisticStatus === "active" ? (
        <AlertDialog
          open={suspendOpen}
          onOpenChange={setSuspendOpen}
          trigger={
            <Button type="button" variant="secondary" disabled={isPending} className="px-3 py-1.5 text-[12px]">
              Suspend
            </Button>
          }
          title="Suspend this user?"
          description={`${displayName} will be logged out immediately and won't be able to sign in until reactivated. You can reverse this at any time.`}
          confirmLabel="Suspend"
          onConfirm={() => runStatusAction(() => suspendUserAction(user.id), "restricted")}
        />
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => runStatusAction(() => activateUserAction(user.id), "active")}
          className="px-3 py-1.5 text-[12px]"
        >
          Activate
        </Button>
      )}

      {optimisticStatus !== "deactivated" && (
        <AlertDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          trigger={
            <Button type="button" variant="danger" disabled={isPending} className="px-3 py-1.5 text-[12px]">
              Delete
            </Button>
          }
          title="Delete this user?"
          description={`This deactivates ${displayName}'s account and immediately logs them out. Their listings, reviews, and history are kept (deleting the row outright isn't possible without breaking that history) — this can be reversed by reactivating the account.`}
          confirmLabel="Delete"
          onConfirm={() => runStatusAction(() => deleteUserAction(user.id), "deactivated")}
        />
      )}
    </div>
  );
}
