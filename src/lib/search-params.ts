// Pure parsing helpers for /cars search params — kept separate from
// src/app/cars/page.tsx so that file stays focused on composing the query.
import { MIN_YEAR, PROVINCE_BY_CITY } from "@/lib/constants";

/** Parses a positive integer query param, or undefined if missing/invalid. */
export function parseIntParam(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : undefined;
}

/** Parses a model year, clamped to a sane range. */
export function parseYearParam(value: string | undefined): number | undefined {
  const n = parseIntParam(value);
  if (n === undefined) return undefined;
  const maxYear = new Date().getFullYear() + 1;
  return n >= MIN_YEAR && n <= maxYear ? n : undefined;
}

/** Cities belonging to a given province, for the derived Province filter. */
export function citiesInProvince(province: string): string[] {
  return Object.entries(PROVINCE_BY_CITY)
    .filter(([, p]) => p === province)
    .map(([city]) => city);
}

const OWNERSHIP_BUCKETS = new Set(["first", "second", "third_plus"]);
export function isOwnershipBucket(value: string | undefined): value is "first" | "second" | "third_plus" {
  return !!value && OWNERSHIP_BUCKETS.has(value);
}
