import Image from "next/image";
import Link from "next/link";
import { Badge, TableCell, TableRow } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { UserSummary } from "@/lib/admin/users";
import { AdminUserActions } from "./user-actions";

const VERIFICATION_BADGE = {
  verified: { tone: "verified" as const, label: "Verified" },
  pending: { tone: "review" as const, label: "Pending" },
  none: { tone: "neutral" as const, label: "Unverified" },
};

function UserAvatar({ user, size = 40 }: { user: UserSummary; size?: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-full bg-neutral-chip" style={{ height: size, width: size }}>
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt={user.displayName ?? "User"} fill className="object-cover" sizes={`${size}px`} />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-sm font-medium text-muted">
          {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

/** Compact card row — used by the dashboard's "Recent Users" widget, where a handful
 * of users are previewed alongside other sections rather than in a dedicated table. */
export function UserRow({ user }: { user: UserSummary }) {
  const badge = VERIFICATION_BADGE[user.verificationStatus];

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-input border border-border p-3.5">
      <UserAvatar user={user} />

      <div className="min-w-[160px] flex-1">
        <p className="truncate text-[13px] font-semibold">{user.displayName ?? "No name"}</p>
        <p className="truncate text-[12px] text-muted">{user.email ?? "No email on file"}</p>
      </div>

      <div className="hidden shrink-0 text-[12px] text-muted sm:block">Joined {formatDate(user.createdAt)}</div>

      <div className="shrink-0 text-center text-[12px] text-muted">
        <span className="font-semibold text-foreground">{user.listingCount}</span> listing
        {user.listingCount === 1 ? "" : "s"}
      </div>

      <Badge tone={badge.tone} className="shrink-0 px-2.5 py-1 text-[11px]">
        {badge.label}
      </Badge>

      <Link
        href={`/admin/users/${user.id}`}
        className="shrink-0 rounded-control border border-border-input px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-background"
      >
        View Profile
      </Link>
    </div>
  );
}

/** Real table row — used by the full /admin/users directory, where many users are
 * scanned as uniform records rather than previewed a few at a time. Same data, same
 * avatar/badge pieces as UserRow above, just laid out as table cells instead of a card. */
export function UserTableRow({ user }: { user: UserSummary }) {
  const badge = VERIFICATION_BADGE[user.verificationStatus];

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <UserAvatar user={user} size={36} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.displayName ?? "No name"}</p>
            <p className="truncate text-[12px] text-muted sm:hidden">{user.email ?? "No email on file"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">{user.email ?? "No email on file"}</TableCell>
      <TableCell className="hidden md:table-cell whitespace-nowrap">{formatDate(user.createdAt)}</TableCell>
      <TableCell className="text-center">{user.listingCount}</TableCell>
      <TableCell>
        <Badge tone={badge.tone} className="px-2.5 py-1 text-[11px]">
          {badge.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <AdminUserActions user={user} />
          <Link
            href={`/admin/users/${user.id}`}
            className="whitespace-nowrap rounded-control border border-border-input px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-background"
          >
            View Profile
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}
