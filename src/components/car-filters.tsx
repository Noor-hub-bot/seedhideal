"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Input, Label, Select } from "@/components/ui";
import { SaveSearchButton } from "@/components/save-search-button";
import {
  ASSEMBLY_OPTIONS,
  BODY_TYPES,
  CITIES,
  COLORS,
  FUEL_TYPES,
  MAKES,
  MIN_YEAR,
  OWNERSHIP_TYPES,
  PROVINCES,
  SELLER_TYPES,
  SORT_OPTIONS,
  TRANSMISSIONS,
} from "@/lib/constants";

// Every filter param this component owns (excludes `layout`, which the
// existing grid/list toggle already manages via plain Links).
const FILTER_KEYS = [
  "q",
  "make",
  "model",
  "variant",
  "city",
  "registrationCity",
  "province",
  "priceMin",
  "priceMax",
  "yearMin",
  "yearMax",
  "mileageMax",
  "fuel",
  "transmission",
  "engineMin",
  "engineMax",
  "bodyType",
  "exteriorColor",
  "interiorColor",
  "assembly",
  "ownershipType",
  "sellerType",
  "verified",
  "featured",
  "sort",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterValues = Partial<Record<FilterKey, string>>;

const MILEAGE_CAPS = [
  { label: "Any mileage", value: "" },
  { label: "Up to 25,000 km", value: "25000" },
  { label: "Up to 50,000 km", value: "50000" },
  { label: "Up to 75,000 km", value: "75000" },
  { label: "Up to 100,000 km", value: "100000" },
  { label: "Up to 150,000 km", value: "150000" },
  { label: "Up to 200,000 km", value: "200000" },
];

const currentYear = new Date().getFullYear() + 1;
const YEARS = Array.from({ length: currentYear - MIN_YEAR + 1 }, (_, i) => currentYear - i);

export function CarFilters({
  values,
  models,
  variants,
  layout,
}: {
  values: FilterValues;
  models: string[];
  variants: string[];
  layout: "grid" | "list";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Local buffer only for free-typed numeric fields, so keystrokes feel
  // instant while the URL update (and therefore the server refetch) is
  // debounced. Everything else reads straight from `values` (server-driven).
  const serverValuesKey = [values.q, values.priceMin, values.priceMax, values.engineMin, values.engineMax].join("|");
  const [numeric, setNumeric] = useState({
    q: values.q ?? "",
    priceMin: values.priceMin ?? "",
    priceMax: values.priceMax ?? "",
    engineMin: values.engineMin ?? "",
    engineMax: values.engineMax ?? "",
  });
  // Resync the buffer when navigation changes params externally (back/forward,
  // chip removal) — adjusted during render rather than an effect, per React's
  // guidance for state that should reset when a prop changes.
  const [prevServerValuesKey, setPrevServerValuesKey] = useState(serverValuesKey);
  if (serverValuesKey !== prevServerValuesKey) {
    setPrevServerValuesKey(serverValuesKey);
    setNumeric({
      q: values.q ?? "",
      priceMin: values.priceMin ?? "",
      priceMax: values.priceMax ?? "",
      engineMin: values.engineMin ?? "",
      engineMax: values.engineMax ?? "",
    });
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commit(next: FilterValues) {
    const sp = new URLSearchParams();
    if (layout === "list") sp.set("layout", "list");
    for (const key of FILTER_KEYS) {
      const v = key in next ? next[key] : values[key];
      if (v) sp.set(key, v);
    }
    sp.delete("page"); // any filter change resets pagination to page 1
    const qs = sp.toString();
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  }

  function setImmediate(key: FilterKey, value: string) {
    commit({ [key]: value });
  }

  function setDebounced(key: "q" | "priceMin" | "priceMax" | "engineMin" | "engineMax", value: string) {
    setNumeric((prev) => ({ ...prev, [key]: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit({ [key]: value }), 350);
  }

  function clearAll() {
    setOpen(false);
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const activeCount = FILTER_KEYS.filter((k) => k !== "q" && k !== "sort" && values[k]).length;

  const currentQueryString = (() => {
    const sp = new URLSearchParams();
    if (layout === "list") sp.set("layout", "list");
    for (const key of FILTER_KEYS) {
      if (values[key]) sp.set(key, values[key]!);
    }
    return sp.toString();
  })();

  return (
    <>
      <Input
        type="text"
        value={numeric.q}
        onChange={(e) => setDebounced("q", e.target.value)}
        placeholder="Search by make, model or year"
        aria-label="Search"
        className="mb-4"
      />

      <Select
        value={values.sort ?? "featured"}
        onChange={(e) => setImmediate("sort", e.target.value === "featured" ? "" : e.target.value)}
        aria-label="Sort by"
        className="mb-4"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>

      <div className="mb-4 flex items-center justify-between lg:hidden">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen(true)}
          className="w-full justify-center"
        >
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </div>

      <div
        className={`${open ? "fixed inset-0 z-40 flex" : "hidden"} lg:static lg:z-auto lg:flex lg:w-72 lg:shrink-0`}
      >
        {open && (
          <div
            className="absolute inset-0 bg-foreground/30 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
        <div className="relative ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto bg-surface p-5 lg:ml-0 lg:h-auto lg:w-full lg:max-w-none lg:overflow-visible lg:rounded-card lg:border lg:border-border lg:p-5">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <span className="font-semibold">Filters</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            <Section title="Location">
              <Field label="City">
                <Select value={values.city ?? ""} onChange={(e) => setImmediate("city", e.target.value)}>
                  <option value="">All cities</option>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Province">
                <Select value={values.province ?? ""} onChange={(e) => setImmediate("province", e.target.value)}>
                  <option value="">Any province</option>
                  {PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Registered city">
                <Select
                  value={values.registrationCity ?? ""}
                  onChange={(e) => setImmediate("registrationCity", e.target.value)}
                >
                  <option value="">Any</option>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </Section>

            <Section title="Vehicle">
              <Field label="Make">
                <Select value={values.make ?? ""} onChange={(e) => setImmediate("make", e.target.value)}>
                  <option value="">All makes</option>
                  {MAKES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Model">
                <Select
                  value={values.model ?? ""}
                  disabled={!values.make}
                  onChange={(e) => setImmediate("model", e.target.value)}
                >
                  <option value="">{values.make ? "All models" : "Select a make first"}</option>
                  {models.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Variant">
                <Select
                  value={values.variant ?? ""}
                  disabled={!values.model}
                  onChange={(e) => setImmediate("variant", e.target.value)}
                >
                  <option value="">{values.model ? "All variants" : "Select a model first"}</option>
                  {variants.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Body type">
                <Select value={values.bodyType ?? ""} onChange={(e) => setImmediate("bodyType", e.target.value)}>
                  <option value="">Any body type</option>
                  {BODY_TYPES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Assembly">
                <Select value={values.assembly ?? ""} onChange={(e) => setImmediate("assembly", e.target.value)}>
                  <option value="">Any</option>
                  {ASSEMBLY_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </Section>

            <Section title="Year & price">
              <div className="flex gap-2">
                <Select
                  aria-label="Year from"
                  value={values.yearMin ?? ""}
                  onChange={(e) => setImmediate("yearMin", e.target.value)}
                >
                  <option value="">Year from</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Year to"
                  value={values.yearMax ?? ""}
                  onChange={(e) => setImmediate("yearMax", e.target.value)}
                >
                  <option value="">Year to</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Min PKR"
                  aria-label="Minimum price"
                  value={numeric.priceMin}
                  onChange={(e) => setDebounced("priceMin", e.target.value)}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Max PKR"
                  aria-label="Maximum price"
                  value={numeric.priceMax}
                  onChange={(e) => setDebounced("priceMax", e.target.value)}
                />
              </div>
            </Section>

            <Section title="Condition">
              <Field label="Mileage">
                <Select
                  value={values.mileageMax ?? ""}
                  onChange={(e) => setImmediate("mileageMax", e.target.value)}
                >
                  {MILEAGE_CAPS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ownership">
                <Select
                  value={values.ownershipType ?? ""}
                  onChange={(e) => setImmediate("ownershipType", e.target.value)}
                >
                  <option value="">Any</option>
                  {OWNERSHIP_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Min cc"
                  aria-label="Minimum engine size"
                  value={numeric.engineMin}
                  onChange={(e) => setDebounced("engineMin", e.target.value)}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Max cc"
                  aria-label="Maximum engine size"
                  value={numeric.engineMax}
                  onChange={(e) => setDebounced("engineMax", e.target.value)}
                />
              </div>
              <Field label="Fuel">
                <Select value={values.fuel ?? ""} onChange={(e) => setImmediate("fuel", e.target.value)}>
                  <option value="">Any fuel</option>
                  {FUEL_TYPES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Transmission">
                <Select
                  value={values.transmission ?? ""}
                  onChange={(e) => setImmediate("transmission", e.target.value)}
                >
                  <option value="">Any transmission</option>
                  {TRANSMISSIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </Section>

            <Section title="Appearance">
              <Field label="Exterior color">
                <Select
                  value={values.exteriorColor ?? ""}
                  onChange={(e) => setImmediate("exteriorColor", e.target.value)}
                >
                  <option value="">Any color</option>
                  {COLORS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Interior color">
                <Select
                  value={values.interiorColor ?? ""}
                  onChange={(e) => setImmediate("interiorColor", e.target.value)}
                >
                  <option value="">Any color</option>
                  {COLORS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </Section>

            <Section title="Seller">
              <Field label="Seller type">
                <Select
                  value={values.sellerType ?? ""}
                  onChange={(e) => setImmediate("sellerType", e.target.value)}
                >
                  <option value="">Any seller</option>
                  {SELLER_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <label className="flex items-center gap-2 text-[15px] text-foreground">
                <input
                  type="checkbox"
                  checked={values.verified === "1"}
                  onChange={(e) => setImmediate("verified", e.target.checked ? "1" : "")}
                  className="h-4 w-4 rounded border-border-input accent-current text-brand"
                />
                Verified sellers only
              </label>
              <label className="flex items-center gap-2 text-[15px] text-foreground">
                <input
                  type="checkbox"
                  checked={values.featured === "1"}
                  onChange={(e) => setImmediate("featured", e.target.checked ? "1" : "")}
                  className="h-4 w-4 rounded border-border-input accent-current text-brand"
                />
                Featured listings only
              </label>
            </Section>

            <div className="flex items-center justify-between gap-3">
              <SaveSearchButton queryString={currentQueryString} />
            </div>

            <Button type="button" variant="secondary" onClick={clearAll} className="w-full justify-center">
              Clear all filters
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 text-[13px] font-normal text-muted">{label}</Label>
      {children}
    </div>
  );
}
