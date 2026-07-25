import Link from "next/link";

// Plain Link-based pagination — works with JS disabled and is crawlable,
// unlike a client-only pager. Not tied to /cars so it can be reused elsewhere.
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      <PageLink
        href={buildHref(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        Prev
      </PageLink>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted">
            …
          </span>
        ) : (
          <PageLink key={p} href={buildHref(p)} active={p === page} aria-label={`Page ${p}`}>
            {p}
          </PageLink>
        ),
      )}
      <PageLink
        href={buildHref(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  active = false,
  disabled = false,
  children,
  ...rest
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
} & React.ComponentProps<"a">) {
  const base =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-input border px-3 text-[13px] font-semibold transition-colors";
  if (disabled) {
    return (
      <span className={`${base} border-border text-muted opacity-50`} aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} ${
        active
          ? "border-brand bg-brand text-white"
          : "border-border-input bg-surface text-foreground hover:bg-background"
      }`}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Builds a compact page-number window, e.g. [1, "…", 4, 5, 6, "…", 12]. */
function pageWindow(page: number, totalPages: number): (number | "…")[] {
  const windowSize = 1;
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - windowSize; p <= page + windowSize; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}
