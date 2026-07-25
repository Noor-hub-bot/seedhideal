import type { ReactNode } from "react";

// Horizontal-scroll row of listing cards — shared by Recently Added, Featured
// Cars and Premium Picks so the "row of cards" layout exists in one place.
export function CarRail({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2">
      {children}
    </div>
  );
}

export function CarRailItem({ children }: { children: ReactNode }) {
  return <div className="w-[260px] shrink-0 snap-start sm:w-[280px]">{children}</div>;
}
