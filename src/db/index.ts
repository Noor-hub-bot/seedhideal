import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const RETRIES = 6;
const MAX_BACKOFF_MS = 2000;

// Retries transient network failures (e.g. flaky Wi-Fi/IPv6 hiccups) to the
// Neon HTTP endpoint — Drizzle would otherwise surface any dropped connection
// as a 500 on the very next page load. Homepage now fires many more
// concurrent queries per request than before, which makes transient failures
// more likely to show up somewhere in that burst — more retries and a longer
// backoff cap give a real blip more room to clear before giving up.
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      if (attempt >= RETRIES) throw err;
      await new Promise((r) => setTimeout(r, Math.min(200 * 2 ** attempt, MAX_BACKOFF_MS)));
    }
  }
};

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
export * from "./schema";
