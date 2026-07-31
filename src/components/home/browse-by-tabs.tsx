"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { Heading } from "@/components/ui";

// Consolidates the previous Brand / Body Type / Budget sections (each with
// its own <section>/SectionHeading/py-14 wrapper) into one shared shell with
// tab-switching. The three data-fetching components (BrandGrid, BodyTypeGrid,
// BudgetGrid) are untouched Server Components, still each behind their own
// <Suspense> in page.tsx — they're passed in as `children` and stay mounted
// simultaneously; switching tabs only toggles CSS visibility (`hidden`), so
// each panel keeps streaming/caching exactly as it did before this change.
const TABS = [
  { id: "brand", label: "Brand" },
  { id: "body-type", label: "Body type" },
  { id: "budget", label: "Budget" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SUBTITLES: Partial<Record<TabId, string>> = {
  "body-type": "Not every listing has this set yet — counts reflect real inventory.",
};

export function BrowseByTabs({
  brand,
  bodyType,
  budget,
}: {
  brand: ReactNode;
  bodyType: ReactNode;
  budget: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("brand");
  const baseId = useId();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    brand: null,
    "body-type": null,
    budget: null,
  });

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    const nextTab = TABS[next];
    setActive(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  }

  const panels: Record<TabId, ReactNode> = { brand, "body-type": bodyType, budget };

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading as="h2" size="md">
            Browse by
          </Heading>
          {SUBTITLES[active] && <p className="mt-1.5 text-[15px] text-muted">{SUBTITLES[active]}</p>}
        </div>
        <Link href="/cars" className="text-[13px] font-semibold text-brand hover:text-brand-strong">
          See all →
        </Link>
      </div>

      <div role="tablist" aria-label="Browse by" className="mb-6 flex gap-2">
        {TABS.map((tab, i) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                selected ? "bg-brand text-white" : "bg-neutral-chip text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={active !== tab.id}
        >
          {panels[tab.id]}
        </div>
      ))}
    </section>
  );
}
