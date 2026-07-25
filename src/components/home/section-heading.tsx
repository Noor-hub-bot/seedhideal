import Link from "next/link";
import { Heading } from "@/components/ui";

// Shared "title + optional see-all link" header used by every homepage
// browse/rail section, so the layout only exists in one place.
export function SectionHeading({
  title,
  subtitle,
  seeAllHref,
}: {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Heading as="h2" size="md">
          {title}
        </Heading>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="text-[13px] font-semibold text-brand hover:text-brand-strong"
        >
          See all →
        </Link>
      )}
    </div>
  );
}
