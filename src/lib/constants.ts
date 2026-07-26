// Shared marketplace filter/option lists — single source used by the sell
// form, the browse-cars filter bar, and the header search.
export const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad"];
export const MAKES = ["Toyota", "Honda", "Suzuki", "Hyundai", "Kia", "Daihatsu"];

export const FUEL_TYPES = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Electric" },
  { value: "cng", label: "CNG" },
] as const;

export const TRANSMISSIONS = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
] as const;

export const BODY_TYPES = [
  "Sedan",
  "Hatchback",
  "SUV",
  "Crossover",
  "Van",
  "Pickup",
  "Coupe",
  "Convertible",
];

// Shared exterior/interior color picklist — kept curated (not free text) so
// filter values reliably match what sellers select.
export const COLORS = [
  "White",
  "Black",
  "Silver",
  "Grey",
  "Red",
  "Blue",
  "Brown",
  "Beige",
  "Green",
  "Gold",
  "Maroon",
  "Other",
];

export const ASSEMBLY_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "imported", label: "Imported" },
] as const;

export const SELLER_TYPES = [
  { value: "individual", label: "Private owner" },
  { value: "dealer", label: "Dealer" },
] as const;

export const OWNERSHIP_TYPES = [
  { value: "first", label: "1st owner" },
  { value: "second", label: "2nd owner" },
  { value: "third_plus", label: "3rd owner or more" },
] as const;

// Every current CITIES value maps to a province/territory — used to derive a
// Province filter without a dedicated schema column.
export const PROVINCE_BY_CITY: Record<string, string> = {
  Lahore: "Punjab",
  Rawalpindi: "Punjab",
  Faisalabad: "Punjab",
  Karachi: "Sindh",
  Islamabad: "Islamabad Capital Territory",
};
export const PROVINCES = [...new Set(Object.values(PROVINCE_BY_CITY))];

export const MIN_YEAR = 1980;

export const PAGE_SIZE = 24;

// Shared "Browse by Budget" buckets (homepage grid + quick search + /cars deep
// links) — amounts in PKR, lac = 100,000.
export const BUDGET_BUCKETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under 10 Lac", max: 1_000_000 },
  { label: "10–20 Lac", min: 1_000_000, max: 2_000_000 },
  { label: "20–30 Lac", min: 2_000_000, max: 3_000_000 },
  { label: "30–50 Lac", min: 3_000_000, max: 5_000_000 },
  { label: "Above 50 Lac", min: 5_000_000 },
];

// Homepage "Premium picks" threshold — one bracket above the top Budget bucket.
export const PREMIUM_PRICE_THRESHOLD_PKR = 6_000_000;

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured first" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

// Also re-exported from lib/storage.ts. Kept here (not there) because sell-form.tsx is a
// Client Component and can't import storage.ts — that module pulls in node:fs/aws-sdk.
export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 8;

// Bump this when Terms of Service content changes — new signups accept the current
// version immediately (see signUpAction).
export const TERMS_VERSION = "2026-07-23";
