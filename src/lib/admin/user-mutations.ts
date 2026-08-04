// Core user-management mutation logic — deliberately NOT a "use server" file. Every
// exported async function in a "use server" file becomes its own directly-invokable
// client RPC endpoint regardless of whether client code imports it, so the staff-auth
// check (requireStaff) must live in the "use server" wrappers in
// src/lib/actions/admin-users.ts, not here. This module only ever runs already
// authenticated as a known staff id, passed in explicitly by its caller.
import { and, eq, isNull, ne } from "drizzle-orm";
import { auditLog, db, sessions, users, verificationCases } from "@/db";
import { notify } from "@/lib/notify";
import type { UserAccountStatus, UserRole } from "@/lib/admin/users";

export type UserActionResult = { ok: true; message: string } | { ok: false; error: string };

export const ROLES: UserRole[] = ["user", "reviewer", "moderator", "support", "admin"];
export const STAFF_ROLES = new Set<UserRole>(["reviewer", "moderator", "support", "admin"]);

/** Ensures an action never leaves the marketplace with zero staff who can reach
 * /admin at all — the only hard safety rail here, since everything else (suspend,
 * deactivate, demote) is otherwise fully reversible by another admin. Only meaningful
 * when the target itself is about to stop being active staff — checks whether any
 * OTHER active staff member would remain. */
async function isLastActiveStaffMember(targetUserId: string): Promise<boolean> {
  const others = await db
    .select({ role: users.role })
    .from(users)
    .where(and(ne(users.id, targetUserId), eq(users.status, "active")));
  return !others.some((r) => STAFF_ROLES.has(r.role as UserRole));
}

export async function setUserStatusAsStaff(
  staffId: string,
  userId: string,
  status: UserAccountStatus,
  actionLabel: string,
): Promise<UserActionResult> {
  if (staffId === userId) return { ok: false, error: `You can't ${actionLabel} your own account.` };

  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) return { ok: false, error: "User not found." };
  if (target.status === status) return { ok: true, message: `User is already ${status}.` };

  const targetIsStaffNow = STAFF_ROLES.has(target.role as UserRole) && target.status === "active";
  if (targetIsStaffNow && status !== "active" && (await isLastActiveStaffMember(userId))) {
    return { ok: false, error: "This is the last active staff account — promote another user to staff first." };
  }

  await db.update(users).set({ status }).where(eq(users.id, userId));

  // Revoking sessions makes suspend/deactivate take effect immediately, not just on
  // this user's next login — the same mechanism signOutCurrentSession uses.
  if (status !== "active") {
    await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  await db.insert(auditLog).values({
    actorId: staffId,
    objectType: "user",
    objectId: userId,
    action: `status_${status}`,
    priorState: target.status,
    newState: status,
  });

  await notify({
    userId,
    type: `account_${status}`,
    title:
      status === "active"
        ? "Your account is active again"
        : status === "restricted"
          ? "Your account has been suspended"
          : "Your account has been deactivated",
    body: status === "restricted" || status === "deactivated" ? "Contact support if you believe this was a mistake." : undefined,
  });

  return { ok: true, message: `User ${status === "active" ? "activated" : status === "restricted" ? "suspended" : "deleted"}.` };
}

export async function changeUserRoleAsStaff(staffId: string, userId: string, role: string): Promise<UserActionResult> {
  if (staffId === userId) return { ok: false, error: "You can't change your own role." };
  if (!ROLES.includes(role as UserRole)) return { ok: false, error: "Not a valid role." };

  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) return { ok: false, error: "User not found." };
  if (target.role === role) return { ok: true, message: `User is already ${role}.` };

  const losesStaff = STAFF_ROLES.has(target.role as UserRole) && !STAFF_ROLES.has(role as UserRole) && target.status === "active";
  if (losesStaff && (await isLastActiveStaffMember(userId))) {
    return { ok: false, error: "This is the last active staff account — promote another user to staff first." };
  }

  await db.update(users).set({ role: role as UserRole }).where(eq(users.id, userId));

  await db.insert(auditLog).values({
    actorId: staffId,
    objectType: "user",
    objectId: userId,
    action: "role_changed",
    priorState: target.role,
    newState: role,
  });

  return { ok: true, message: `Role changed to ${role}.` };
}

export async function verifyPendingCase(caseId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [existing] = await db.select({ status: verificationCases.status }).from(verificationCases).where(eq(verificationCases.id, caseId));
  if (!existing) return { ok: false, error: "Verification case not found." };
  if (existing.status !== "pending") return { ok: false, error: `This case is already ${existing.status}.` };
  return { ok: true };
}
