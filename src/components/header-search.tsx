import { CITIES } from "@/lib/constants";

// Combined search + location bar: one continuous rounded-full container,
// divided internally by a hairline — matches the reference's single pill
// rather than two separate fields. Submits a plain GET to /cars, reusing
// the existing `q` / `city` filters already handled by
// src/app/cars/page.tsx — no new filtering logic lives here.
export function HeaderSearchForm({ className = "" }: { className?: string }) {
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
