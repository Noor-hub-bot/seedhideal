import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  bigint,
  timestamp,
  boolean,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// ---------- Enums (states mirror PRD Appendix B) ----------

export const userRole = pgEnum("user_role", [
  "user",
  "reviewer",
  "moderator",
  "support",
  "admin",
]);

export const userStatus = pgEnum("user_status", [
  "active",
  "restricted",
  "deactivated",
]);

export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "action_required",
  "verified",
  "rejected",
  "expired",
  "suspended",
]);

export const sellerRelationship = pgEnum("seller_relationship", [
  "owner",
  "family",
  "representative",
]);

export const listingStatus = pgEnum("listing_status", [
  "draft",
  "submitted",
  "under_review",
  "correction",
  "active",
  "paused",
  "suspended",
  "sold",
  "expired",
  "closed",
]);

export const transmission = pgEnum("transmission", ["manual", "automatic"]);

// Minimal seller-type distinction for the Seller Type search filter — no separate
// dealer onboarding/pricing/admin workflow; individual remains the default and the
// one-active-listing rule (LST-01) is unchanged for both types.
export const sellerType = pgEnum("seller_type", ["individual", "dealer"]);

export const assemblyType = pgEnum("assembly_type", ["local", "imported"]);

export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);

export const otpPurpose = pgEnum("otp_purpose", ["verify_email", "reset_password"]);

export const boostStatus = pgEnum("boost_status", ["pending", "active", "expired", "cancelled"]);

export const fuelType = pgEnum("fuel_type", [
  "petrol",
  "diesel",
  "hybrid",
  "electric",
  "cng",
]);

export const photoKind = pgEnum("photo_kind", [
  "front",
  "rear",
  "left",
  "right",
  "interior",
  "odometer",
  "engine_bay",
  "other",
]);

export const inquiryIntent = pgEnum("inquiry_intent", [
  "question",
  "offer",
  "visit",
]);

export const inquiryStatus = pgEnum("inquiry_status", [
  "sent",
  "responded",
  "declined",
  "reported",
  "closed",
]);

export const offerStatus = pgEnum("offer_status", [
  "open",
  "countered",
  "accepted_for_discussion",
  "declined",
  "expired",
  "withdrawn",
]);

export const visitStatus = pgEnum("visit_status", [
  "requested",
  "confirmed",
  "rescheduled",
  "cancelled",
  "completed",
  "no_show",
]);

export const visitOutcome = pgEnum("visit_outcome", [
  "met",
  "no_show",
  "rescheduled",
  "not_interested",
  "negotiating",
  "sold",
]);

export const reportCategory = pgEnum("report_category", [
  "fake_listing",
  "ownership_concern",
  "dealer_mislabeling",
  "scam_request",
  "harassment",
  "incorrect_condition",
]);

export const reportStatus = pgEnum("report_status", [
  "new",
  "triaged",
  "investigating",
  "actioned",
  "appealed",
  "closed",
]);

export const ticketSeverity = pgEnum("ticket_severity", [
  "low",
  "standard",
  "payment",
  "safety",
]);

export const ticketStatus = pgEnum("ticket_status", [
  "new",
  "assigned",
  "waiting_user",
  "waiting_internal",
  "escalated",
  "resolved",
  "closed",
  "reopened",
]);

// ---------- Core tables ----------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Primary identity going forward. Nullable at the DB level only because pre-migration
  // phone-only test rows have none — every new signup/Google/reset path always sets it.
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: text("password_hash"), // null for Google-only accounts
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  googleId: varchar("google_id", { length: 64 }).unique(),
  // Optional profile field only — no longer used for authentication.
  phone: varchar("phone", { length: 16 }).unique(),
  displayName: varchar("display_name", { length: 100 }),
  city: varchar("city", { length: 64 }),
  avatarUrl: text("avatar_url"),
  language: varchar("language", { length: 8 }).default("en"),
  role: userRole("role").notNull().default("user"),
  status: userStatus("status").notNull().default("active"),
  termsVersion: varchar("terms_version", { length: 16 }),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    purpose: otpPurpose("purpose").notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("otp_email_purpose_idx").on(t.email, t.purpose)],
);

export const sessions = pgTable(
  "sessions",
  {
    token: varchar("token", { length: 64 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const verificationCases = pgTable("verification_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: verificationStatus("status").notNull().default("pending"),
  relationship: sellerRelationship("relationship"),
  // Private storage keys — the documents themselves live in a restricted bucket, never public (VER-04)
  identityDocKey: text("identity_doc_key"),
  ownershipDocKey: text("ownership_doc_key"),
  reasonCode: varchar("reason_code", { length: 64 }),
  reviewerNote: text("reviewer_note"),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id),
    status: listingStatus("status").notNull().default("draft"),
    make: varchar("make", { length: 48 }).notNull(),
    model: varchar("model", { length: 48 }).notNull(),
    variant: varchar("variant", { length: 64 }),
    year: integer("year").notNull(),
    city: varchar("city", { length: 64 }).notNull(),
    registrationCity: varchar("registration_city", { length: 64 }),
    mileageKm: integer("mileage_km").notNull(),
    transmission: transmission("transmission").notNull(),
    fuel: fuelType("fuel").notNull(),
    engineCc: integer("engine_cc"),
    ownershipCount: integer("ownership_count"),
    askingPricePkr: bigint("asking_price_pkr", { mode: "number" }).notNull(),
    sellerType: sellerType("seller_type").notNull().default("individual"),
    // Fast-read cache for ranking/badges — kept in sync with the currently active
    // row (if any) in `listingBoosts` by approveBoostAction and the sweep-boosts
    // cron. listingBoosts stays the source of truth for history/analytics; these
    // two columns exist so /cars and the homepage never need to join it.
    featured: boolean("featured").notNull().default(false),
    featuredPriority: integer("featured_priority").notNull().default(0),
    // Open marketplace taxonomies (like make/city above) — app-level option
    // lists live in src/lib/constants.ts rather than a fixed DB enum.
    bodyType: varchar("body_type", { length: 32 }),
    exteriorColor: varchar("exterior_color", { length: 32 }),
    interiorColor: varchar("interior_color", { length: 32 }),
    assembly: assemblyType("assembly"),
    description: text("description"),
    // Structured condition disclosures (LST-03): paintedPanels, accidentHistory,
    // mechanicalIssues, documents — controlled options, "unknown" only where policy permits
    disclosures: jsonb("disclosures").$type<{
      paintedPanels?: string;
      accidentHistory?: string;
      mechanicalIssues?: string;
      documents?: string;
    }>(),
    rejectionReason: text("rejection_reason"),
    // Cumulative, best-effort — incremented on /cars/[id] views. Powers Trending
    // Cars and the dashboard Listing Analytics tab; not a time-windowed signal
    // (that would need a per-event log table, a separate future feature).
    viewCount: integer("view_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    reportedSoldPricePkr: bigint("reported_sold_price_pkr", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("listings_status_idx").on(t.status),
    index("listings_city_idx").on(t.city),
    index("listings_seller_idx").on(t.sellerId),
    index("listings_make_idx").on(t.make),
    index("listings_make_model_idx").on(t.make, t.model),
    index("listings_featured_idx").on(t.featured, t.featuredPriority),
  ],
);

export const listingPhotos = pgTable(
  "listing_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    kind: photoKind("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("photos_listing_idx").on(t.listingId)],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id),
    intent: inquiryIntent("intent").notNull(),
    status: inquiryStatus("status").notNull().default("sent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inquiries_listing_idx").on(t.listingId),
    index("inquiries_buyer_idx").on(t.buyerId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_inquiry_idx").on(t.inquiryId)],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id),
    inquiryId: uuid("inquiry_id").references(() => inquiries.id),
    amountPkr: bigint("amount_pkr", { mode: "number" }).notNull(),
    counterAmountPkr: bigint("counter_amount_pkr", { mode: "number" }),
    status: offerStatus("status").notNull().default("open"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("offers_listing_idx").on(t.listingId)],
);

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id),
    inquiryId: uuid("inquiry_id").references(() => inquiries.id),
    proposedWindows: jsonb("proposed_windows").$type<string[]>(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    status: visitStatus("status").notNull().default("requested"),
    sellerOutcome: visitOutcome("seller_outcome"),
    buyerOutcome: visitOutcome("buyer_outcome"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("visits_listing_idx").on(t.listingId)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] })],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id),
  listingId: uuid("listing_id").references(() => listings.id),
  reportedUserId: uuid("reported_user_id").references(() => users.id),
  category: reportCategory("category").notNull(),
  detail: text("detail"),
  status: reportStatus("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: integer("ticket_number").generatedAlwaysAsIdentity(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  subject: varchar("subject", { length: 200 }).notNull(),
  objectType: varchar("object_type", { length: 32 }),
  objectId: uuid("object_id"),
  severity: ticketSeverity("severity").notNull().default("standard"),
  status: ticketStatus("status").notNull().default("new"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    isStaff: boolean("is_staff").notNull().default(false),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 48 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

// Append-only audit history (ADM-02, NFR-26): every material state change lands here
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id),
    objectType: varchar("object_type", { length: 32 }).notNull(),
    objectId: uuid("object_id").notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    priorState: varchar("prior_state", { length: 64 }),
    newState: varchar("new_state", { length: 64 }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_object_idx").on(t.objectType, t.objectId)],
);

// Reviews (homepage "Customer Reviews"). Schema intentionally leaves room for
// features not built yet, without needing a future migration:
//  - replies:        a future `review_replies` table FK'd to reviews.id (shape of
//                     ticket_messages -> support_tickets)
//  - images:         a future `review_photos` table FK'd to reviews.id (shape of
//                     listing_photos -> listings)
//  - helpful votes:  a future `review_votes` table (userId+reviewId, shape of
//                     `favorites`) would increment `helpfulCount` below
//  - verified buyer/seller: `listingId` ties a review to a real transaction context
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    // Shown name — "Anonymous" when isAnonymous; authorId is still recorded either way.
    displayName: varchar("display_name", { length: 100 }).notNull(),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body").notNull(),
    listingId: uuid("listing_id").references(() => listings.id),
    status: reviewStatus("status").notNull().default("pending"),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    reviewerNote: text("reviewer_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    helpfulCount: integer("helpful_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reviews_status_idx").on(t.status),
    index("reviews_author_idx").on(t.authorId),
  ],
);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Featured Listings (Phase 1). Catalog of boost offerings — admin-seeded for now,
// no CRUD UI yet. `pricePkr` is informational only until payment is wired up.
export const featuredPlans = pgTable("featured_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  priority: integer("priority").notNull(), // higher ranks higher within Featured
  pricePkr: bigint("price_pkr", { mode: "number" }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per boost request/period for a listing. `listings.featured` /
// `featuredPriority` are a fast-read cache derived from whichever row here is
// currently "active" — this table is the source of truth for history and
// analytics. Mirrors verificationCases' review shape (reviewerId/reviewerNote/
// reviewedAt) since both are "seller requests, staff decides" flows.
// Payment-ready: swapping the admin-approval step for a payment webhook later
// only changes how a row moves from "pending" to "active" — everything else
// (ranking, badge, expiry sweep, analytics) is unaffected.
export const listingBoosts = pgTable(
  "listing_boosts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => featuredPlans.id),
    priority: integer("priority").notNull(), // copied from the plan at request time
    status: boostStatus("status").notNull().default("pending"),
    startAt: timestamp("start_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    reviewerNote: text("reviewer_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // Featured Analytics — best-effort counters, incremented from the homepage
    // Featured rail (impressions) and the listing detail page (clicks).
    impressionCount: integer("impression_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("listing_boosts_status_idx").on(t.status),
    index("listing_boosts_listing_idx").on(t.listingId),
  ],
);

// ---------- Phase 2 ----------

// Dealer public profile. Verification reuses `verificationCases` as-is (a dealer
// submits identity/business documents through the same flow and admin queue as an
// individual owner — `sellerRelationship.representative` fits a dealer submitter
// without an enum change). Rating/reviews are computed by joining
// `reviews.listingId -> listings.sellerId`, not stored here.
export const dealerProfiles = pgTable(
  "dealer_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    businessName: varchar("business_name", { length: 120 }).notNull(),
    logoKey: text("logo_key"),
    coverImageKey: text("cover_image_key"),
    description: text("description"),
    contactPhone: varchar("contact_phone", { length: 32 }),
    contactEmail: varchar("contact_email", { length: 254 }),
    address: varchar("address", { length: 240 }),
    city: varchar("city", { length: 64 }),
    workingHours: jsonb("working_hours").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("dealer_profiles_user_idx").on(t.userId)],
);

// Serves both the Dashboard "Saved Searches" tab and Marketplace Features' "Saved
// Filters" — same feature, one table. `queryString` is the /cars query string
// verbatim, re-run by linking straight to `/cars?${queryString}`.
export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    queryString: text("query_string").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("saved_searches_user_idx").on(t.userId)],
);

// Upserted (viewedAt bumped) on each view rather than appended — one row per
// user+listing, not a full view log. Composite PK, same shape as `favorites`.
export const recentlyViewed = pgTable(
  "recently_viewed",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recently_viewed_user_idx").on(t.userId),
    primaryKey({ columns: [t.userId, t.listingId] }),
  ],
);

// Single-row table (id is always "default") backing the admin-editable Website
// Settings/CMS — content that used to be hardcoded across layout.tsx, page.tsx,
// footer.tsx, robots.ts, etc. One row rather than a generic key-value table: every
// field here is edited together from one settings page and read together on nearly
// every request, so a single row keeps that a single real query instead of N. Grouped
// into one jsonb column per admin-settings tab (not one column per field) so adding a
// field within a tab later never requires a schema migration.
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("default"),
  general: jsonb("general").$type<{
    siteName: string;
    description: string;
    supportEmail: string;
    supportPhone: string;
    whatsappNumber: string;
    address: string;
    timezone: string;
    currency: string;
    language: string;
  }>().notNull(),
  homepage: jsonb("homepage").$type<{
    heroTitle: string;
    heroSubtitle: string;
    heroBackgroundImage: string | null;
    heroButtonText: string;
    heroButtonLink: string;
    heroButtonSecondaryText: string;
    heroButtonSecondaryLink: string;
    stats: { value: string; label: string }[];
    sections: {
      browseBy: boolean;
      recentlyAdded: boolean;
      featuredCars: boolean;
      verifiedSellers: boolean;
      socialProof: boolean;
      statisticsBand: boolean;
      trustComparison: boolean;
      howItWorks: boolean;
      whySeedhiDeal: boolean;
      downloadApp: boolean;
      newsletter: boolean;
      faq: boolean;
    };
  }>().notNull(),
  social: jsonb("social").$type<{
    facebook: string;
    instagram: string;
    youtube: string;
    tiktok: string;
    linkedin: string;
    twitter: string;
    whatsapp: string;
    googleMapsEmbed: string;
  }>().notNull(),
  footer: jsonb("footer").$type<{
    text: string;
    copyright: string;
    privacyLink: string;
    termsLink: string;
    aboutLink: string;
    contactLink: string;
  }>().notNull(),
  seo: jsonb("seo").$type<{
    metaTitle: string;
    metaDescription: string;
    ogImage: string | null;
    twitterImage: string | null;
    robots: string;
    canonicalUrl: string;
  }>().notNull(),
  media: jsonb("media").$type<{
    logo: string | null;
    darkLogo: string | null;
    favicon: string | null;
    vehiclePlaceholder: string | null;
    userAvatarPlaceholder: string | null;
  }>().notNull(),
  maintenance: jsonb("maintenance").$type<{
    enabled: boolean;
    message: string;
  }>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});
