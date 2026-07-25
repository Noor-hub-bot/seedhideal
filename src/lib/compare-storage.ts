// Client-side only — Compare Cars is ephemeral browsing state (not account
// data), so it's kept in localStorage rather than a schema table. Exposed as
// a useSyncExternalStore-compatible store: a cached array reference that's
// only replaced (not re-parsed) on actual mutation, so consumers get stable
// snapshots between changes and correctly re-render on real ones.
const KEY = "sd_compare_ids";
const MAX = 4;

type Listener = () => void;
const listeners = new Set<Listener>();

function readFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

let cache: string[] = readFromStorage();

function commit(next: string[]) {
  cache = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function getCompareSnapshot(): string[] {
  return cache;
}

// Must be a stable reference — useSyncExternalStore compares snapshots with
// Object.is, and a fresh `[]` literal on every call looks like a perpetual
// change, which React flags as a potential infinite loop.
const EMPTY: string[] = [];

export function getServerCompareSnapshot(): string[] {
  return EMPTY;
}

export function subscribeCompare(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleCompareId(id: string): void {
  const current = cache;
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : current.length >= MAX
      ? current
      : [...current, id];
  commit(next);
}

export function clearCompare(): void {
  commit([]);
}

export { MAX as MAX_COMPARE };
