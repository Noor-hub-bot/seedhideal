// Shared status vocab for dashboard tabs (listings, messages) — kept in one
// place so /dashboard/page.tsx and /dashboard/listings don't each invent copy.
export const STATUS_TONE: Record<string, "verified" | "neutral" | "review" | "brand"> = {
  active: "verified",
  submitted: "review",
  under_review: "review",
  correction: "review",
  draft: "neutral",
  paused: "neutral",
  suspended: "review",
  sold: "brand",
  expired: "neutral",
  closed: "neutral",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "Live",
  submitted: "In review",
  under_review: "In review",
  correction: "Needs correction",
  draft: "Draft",
  paused: "Paused",
  suspended: "Suspended",
  sold: "Sold",
  expired: "Expired",
  closed: "Withdrawn",
};

export const INQUIRY_STATUS_LABEL: Record<string, string> = {
  sent: "Awaiting reply",
  responded: "Replied",
  declined: "Declined",
  reported: "Reported",
  closed: "Closed",
};
