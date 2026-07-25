import { Button, Select } from "@/components/ui";
import { CITIES, MAKES } from "@/lib/constants";

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

// Quick search bar — plain GET form straight into the existing /cars route
// (zero JS, works without JS, SEO-safe). Model is a free-text input wired to
// /cars's existing `q` fuzzy-match param (not the strict `model` param, which
// only accepts values from car-filters.tsx's cascading dropdown) — a typed
// value like "corolla" should still match rather than being silently dropped.
export function HeroSearch() {
  return (
    <form
      action="/cars"
      className="rounded-card border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select name="make" defaultValue="" aria-label="Make">
          <option value="">Any make</option>
          {MAKES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
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
