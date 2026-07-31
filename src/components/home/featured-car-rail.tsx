import { FeaturedCars } from "./featured-cars";

// Dedicated wrapper for the Featured rail — kept separate from importing
// FeaturedCars directly in page.tsx so a future milestone can give this
// specific rail a distinct visual treatment (it's the paid/premium
// placement) without touching FeaturedCars' data-fetching logic or
// page.tsx again. No behavior or visual change in this milestone: renders
// FeaturedCars exactly as before, including its own empty-state handling
// (FeaturedCars controls its whole section, heading included — it must stay
// self-contained rather than have a wrapper render a heading unconditionally,
// which would show an empty "Featured cars" title whenever there are no
// active boosts, a common, expected state, not an edge case).
export function FeaturedCarRail() {
  return <FeaturedCars />;
}
