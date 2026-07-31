import type { ReactNode } from "react";

// Groups the Reviews and Featured Dealers sections under one named
// component — both are "what other people think / who else is here" trust
// content, per the homepage audit's Social Proof recommendation. Consolidates
// them at the component-tree level only (one import in page.tsx instead of
// two); each section keeps its own heading, styling, and independent
// empty-state handling exactly as before — same reasoning as M8's
// FeaturedCarRail and M9's TrustBand: forcing one always-visible shared
// heading over two independently-conditional sections risks showing an
// empty title when only one of them has data (dealer onboarding is limited
// today, so an empty dealer strip is a common state, not an edge case). A
// deeper visual merge (one shared heading, unified card treatment) is
// deferred to a future approved milestone.
export function SocialProof({ dealers, reviews }: { dealers: ReactNode; reviews: ReactNode }) {
  return (
    <>
      {dealers}
      {reviews}
    </>
  );
}
