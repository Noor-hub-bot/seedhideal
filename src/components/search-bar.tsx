import { Button, Select } from "@/components/ui";
import { CITIES, MAKES } from "@/lib/constants";

// Unified search — was three separate implementations (Header's own inline
// two-box form, MobileNav's HeaderSearchForm pill, and the homepage's
// HeroSearch card) with inconsistent fields and visual language. Both
// variants below are verbatim ports of the two distinct field sets/markup
// that already existed — no field, param, or behavior changed, just
// consolidated into one component:
//   - "compact": the 2-field (q + city) pill, now shared by the sticky
//     header and the mobile menu (previously HeaderSearchForm).
//   - "expanded": the 5-field (make/model/price/city/submit) card, used only
//     by the homepage hero (previously HeroSearch).
// Both submit a plain GET to /cars — zero JS, works without JS, SEO-safe.

// Single-bound price ladder for the quick-search bar only — a plain <select>
// can only emit one query param without JS, so this uses priceMax alone
// ("Under X Lac"). The dedicated Browse-by-Budget grid further down the page
// uses the full min+max ranges since that section's whole point is the
// breakdown between brackets.
const PRICE_CAPS = [
  { label: "Any price", value: "" },
  { label: "Under 10 Lac", value: "1000000" },
  { label: "Under 20 Lac", value: "2000000" },
  { label: "Under 30 Lac", value: "3000000" },
  { label: "Under 50 Lac", value: "5000000" },
];

export function SearchBar({
  variant = "compact",
  className = "",
}: {
  variant?: "compact" | "expanded";
  className?: string;
}) {
  if (variant === "expanded") {
    return (
      <form action="/cars" className={`rounded-card border border-border bg-surface p-4 shadow-sm sm:p-5 ${className}`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select name="make" defaultValue="" aria-label="Make">
            <option value="">Any make</option>
            {MAKES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
          {/* Free-text, wired to /cars's existing `q` fuzzy-match param (not the
              strict `model` param, which only accepts values from car-filters.tsx's
              cascading dropdown) — a typed value like "corolla" should still match
              rather than being silently dropped. */}
          <input
            type="text"
            name="q"
            placeholder="Model (optional)"
            aria-label="Model"
            className="rounded-input border border-border-input bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-2 focus:outline-brand/25"
          />
          <Select name="priceMax" defaultValue="" aria-label="Price range">
            {PRICE_CAPS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
          <Select name="city" defaultValue="" aria-label="City">
            <option value="">Any city</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Button type="submit" className="justify-center py-2.5">
            Search cars
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      action="/cars"
      className={`flex items-center rounded-full border border-border-input bg-background shadow-sm transition-shadow focus-within:border-brand focus-within:shadow-md ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 pl-5">
        <SearchIcon className="h-[18px] w-[18px] shrink-0 text-muted" />
        <input
          type="text"
          name="q"
          placeholder="Search by make, model or location"
          className="w-full min-w-0 bg-transparent py-3.5 pr-3 text-[15px] text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>

      <span className="h-6 w-px shrink-0 bg-border" />

      <div className="flex shrink-0 items-center gap-2 pl-4 pr-5">
        <PinIcon className="h-[18px] w-[18px] shrink-0 text-muted" />
        <select
          name="city"
          defaultValue=""
          aria-label="City"
          className="appearance-none bg-transparent py-3.5 pr-1 text-[15px] font-medium text-foreground focus:outline-none"
        >
          <option value="">All Pakistan</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <ChevronIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
      </div>

      {/* No visible submit button (Enter-to-submit, standard for a single
          text field) — this hidden one preserves an explicit, labeled action
          for keyboard/screen-reader users, same as Header's previous form had. */}
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
