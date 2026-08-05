// Single source of truth for "how does SeedhiDeal work" content — previously two
// near-duplicate arrays (home/faq-accordion.tsx and app/help/page.tsx) each hand-wrote
// their own, slightly different wording. Consolidated here so both components and the
// AI assistant (which grounds its FAQ answers in this exact content) read one list
// instead of three independently-drifting copies.
//
// Every entry describes a real, currently-shipped feature — a "fast-track paid
// verification" line from the old help-page copy was dropped during this consolidation
// because no such feature exists anywhere in the codebase (verification is free and
// staff-reviewed, see lib/admin/verification-mutations.ts).
export const FAQS: { q: string; a: string }[] = [
  {
    q: "Are all sellers on SeedhiDeal really private owners?",
    a: "Yes, by default — every listing goes through identity and ownership verification before it goes live. A small number of dealer listings are clearly labelled as such.",
  },
  {
    q: "Is it free to list my car?",
    a: "Yes. Listing is free, with one active listing at a time for private sellers. There are no hidden charges at approval.",
  },
  {
    q: "How does verification work?",
    a: "You submit identity and ownership documents once; our team reviews them before your listing is approved and your profile is marked verified.",
  },
  {
    q: "Will my phone number be public?",
    a: "No — your number stays protected. Buyers reach you through a structured inquiry, and you choose when to share contact details or arrange a visit.",
  },
  {
    q: "How do I contact a seller?",
    a: "Open any listing and use the contact options there — no extra sign-up required to browse.",
  },
  {
    q: "What if I have an issue with a buyer or seller?",
    a: "You can report a listing or open a support ticket from your dashboard at any time — every report is tracked until it's resolved.",
  },
];
