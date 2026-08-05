// SeedhiDeal AI Assistant (v1) — a scoped, tool-calling helper, not a general chat
// clone. Two real tools (search_cars, compare_cars) are backed directly by
// src/lib/listing-search.ts — the exact same query the /cars browse page runs, so the
// assistant can never return a listing that isn't real. Listing-description writing and
// FAQ answers need no tool at all: they're pure generation/grounded-recall, handled by
// the model's own reply, grounded in src/lib/faq-content.ts (the same content the site's
// own Help page and homepage FAQ show).
//
// Talks to OpenRouter's OpenAI-compatible chat-completions endpoint via plain fetch — no
// SDK needed for a single REST call. Model is "openrouter/free", OpenRouter's own router
// that picks among whatever free models are currently available, filtered for
// tool-calling support — genuinely $0 and doesn't break if one specific free model is
// delisted (as happened to the DeepSeek/Qwen free tiers this was originally scoped for).
//
// Extensibility: adding a future AI feature means adding one more entry to `TOOLS` and
// one more `case` in `runTool` — the request/response shape, the round-trip loop, and
// the UI never need to change.
import { asc, inArray } from "drizzle-orm";
import { db, listingPhotos } from "@/db";
import { searchListings, type ListingSearchFilters } from "@/lib/listing-search";
import { FAQS } from "@/lib/faq-content";
import { formatKm, formatPkr } from "@/lib/format";
import { BODY_TYPES, CITIES, FUEL_TYPES, MAKES, TRANSMISSIONS } from "@/lib/constants";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";
const MAX_TOOL_ROUNDS = 3;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type CarResult = {
  id: string;
  title: string;
  priceLabel: string;
  city: string;
  mileageLabel: string;
  transmission: string;
  href: string;
  photo: string | null;
};

export type AssistantResponse =
  | { ok: true; reply: string; cars?: CarResult[] }
  | { ok: false; error: string };

type ListingRow = Awaited<ReturnType<typeof searchListings>>[number];

/** Same "first photo by sortOrder" batch lookup used by /api/listings/recent-approvals
 * and lib/listing-enrichment.ts — kept as its own tiny query here (rather than pulling in
 * enrichListings, which also computes verifiedSellers/favoritedSet this doesn't need). */
async function firstPhotoByListing(listingIds: string[]): Promise<Map<string, string>> {
  if (listingIds.length === 0) return new Map();
  const rows = await db
    .select({ listingId: listingPhotos.listingId, storageKey: listingPhotos.storageKey })
    .from(listingPhotos)
    .where(inArray(listingPhotos.listingId, listingIds))
    .orderBy(asc(listingPhotos.sortOrder));
  const map = new Map<string, string>();
  for (const r of rows) if (!map.has(r.listingId)) map.set(r.listingId, r.storageKey);
  return map;
}

function toCarResult(listing: ListingRow, photo: string | null): CarResult {
  return {
    id: listing.id,
    title: `${listing.make} ${listing.model}${listing.variant ? ` ${listing.variant}` : ""}, ${listing.year}`,
    priceLabel: formatPkr(listing.askingPricePkr),
    city: listing.city,
    mileageLabel: formatKm(listing.mileageKm),
    transmission: listing.transmission === "automatic" ? "Automatic" : "Manual",
    href: `/cars/${listing.id}`,
    photo,
  };
}

const SYSTEM_PROMPT = `You are the SeedhiDeal Assistant, built into the SeedhiDeal car marketplace (Pakistan) — a trust-first marketplace for verified private-owner car listings, with a small number of clearly-labelled dealer listings.

Scope: you ONLY help with using SeedhiDeal — finding cars, comparing cars, getting a recommendation, writing a listing description, and answering questions about how the site works. If asked about anything else (general chat, unrelated topics, coding help, etc.), briefly say you're SeedhiDeal's marketplace assistant and can only help with cars and using the site.

Real facts about SeedhiDeal — rely only on these, never invent a policy:
${FAQS.map((f) => `- ${f.q} ${f.a}`).join("\n")}

Real marketplace data you can search against with the search_cars tool — never invent a car, price, or seller:
- Cities: ${CITIES.join(", ")}
- Makes: ${MAKES.join(", ")}
- Body types: ${BODY_TYPES.join(", ")}
- Fuel types: ${FUEL_TYPES.map((f) => f.label).join(", ")}
- Transmissions: ${TRANSMISSIONS.map((t) => t.label).join(", ")}
- Prices are in PKR. "Lakh" = 100,000, "crore" = 10,000,000 (e.g. "40 lakh" = 4,000,000; "1.2 crore" = 12,000,000).

For any request to find, search, browse, or recommend cars, call search_cars with whatever filters you can extract. For a vague recommendation (e.g. "a family car" or "something reliable for a small budget"), choose sensible filter defaults yourself — a family car generally means a Sedan/SUV/Crossover body type; adjust price range to what was actually asked — and briefly explain your reasoning in your reply. Only ever describe cars the tool actually returned; if it returns none, say so honestly and suggest loosening the search, never invent a listing to fill the gap.

For a request to compare two cars, call compare_cars with a short description of each (e.g. "Corolla 2022", "Honda Civic 2021").

For a request to help write a listing description, write one directly in your reply — professional, honest, 3-5 sentences, based only on the details the user actually gave you (make/model/year/mileage/condition/price/city). Ask one brief follow-up question first if you're missing the basics. Never invent a condition detail (accident history, features) the user didn't mention.

Keep every reply short and conversational — a few sentences, not an essay.`;

// OpenAI-compatible function-calling shape (OpenRouter's request/response schema),
// distinct from Anthropic's {name, input_schema} shape this replaced.
type ORTool = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

const TOOLS: ORTool[] = [
  {
    type: "function",
    function: {
      name: "search_cars",
      description:
        "Search real, live SeedhiDeal car listings by any combination of filters. Also used to power recommendations — choose sensible filter values yourself for a vague request.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Free-text search — matches make, model, variant, or a 4-digit model year (e.g. 'Corolla 2022').",
          },
          make: { type: "string", enum: MAKES },
          city: { type: "string", enum: CITIES },
          bodyType: { type: "string", enum: BODY_TYPES },
          fuel: { type: "string", enum: FUEL_TYPES.map((f) => f.value) },
          transmission: { type: "string", enum: ["manual", "automatic"] },
          priceMin: { type: "number", description: "Minimum price in PKR." },
          priceMax: { type: "number", description: "Maximum price in PKR." },
          yearMin: { type: "number", description: "Earliest model year." },
          yearMax: { type: "number", description: "Latest model year." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_cars",
      description: "Looks up two real listings by a short description of each, for a side-by-side comparison.",
      parameters: {
        type: "object",
        properties: {
          carA: { type: "string", description: "e.g. 'Toyota Corolla 2022'" },
          carB: { type: "string", description: "e.g. 'Honda Civic 2021'" },
        },
        required: ["carA", "carB"],
      },
    },
  },
];

type ToolOutcome = { toolResultText: string; cars: CarResult[] };

function asSearchFilters(input: Record<string, unknown>): ListingSearchFilters {
  const transmission = input.transmission === "automatic" || input.transmission === "manual" ? input.transmission : undefined;
  return {
    q: typeof input.query === "string" ? input.query : undefined,
    make: typeof input.make === "string" ? input.make : undefined,
    city: typeof input.city === "string" ? input.city : undefined,
    bodyType: typeof input.bodyType === "string" ? input.bodyType : undefined,
    fuel: typeof input.fuel === "string" ? input.fuel : undefined,
    transmission,
    priceMin: typeof input.priceMin === "number" ? input.priceMin : undefined,
    priceMax: typeof input.priceMax === "number" ? input.priceMax : undefined,
    yearMin: typeof input.yearMin === "number" ? input.yearMin : undefined,
    yearMax: typeof input.yearMax === "number" ? input.yearMax : undefined,
  };
}

async function runSearchCars(input: Record<string, unknown>): Promise<ToolOutcome> {
  const rows = await searchListings(asSearchFilters(input), 6);
  const photos = await firstPhotoByListing(rows.map((r) => r.id));
  const cars = rows.map((r) => toCarResult(r, photos.get(r.id) ?? null));
  const toolResultText = cars.length
    ? `Found ${cars.length} matching listing(s):\n${cars
        .map((c) => `- ${c.title}, ${c.priceLabel}, ${c.city}, ${c.mileageLabel}, ${c.transmission} (id: ${c.id})`)
        .join("\n")}`
    : "No live listings matched those filters.";
  return { toolResultText, cars };
}

async function runCompareCars(input: Record<string, unknown>): Promise<ToolOutcome> {
  const carA = typeof input.carA === "string" ? input.carA : "";
  const carB = typeof input.carB === "string" ? input.carB : "";
  const [aRows, bRows] = await Promise.all([searchListings({ q: carA }, 1), searchListings({ q: carB }, 1)]);
  const combinedRows = [...aRows, ...bRows];
  const photos = await firstPhotoByListing(combinedRows.map((r) => r.id));
  const cars = combinedRows.map((r) => toCarResult(r, photos.get(r.id) ?? null));

  if (aRows.length === 0 || bRows.length === 0) {
    const missing =
      aRows.length === 0 && bRows.length === 0 ? "either car" : aRows.length === 0 ? `"${carA}"` : `"${carB}"`;
    return { toolResultText: `Could not find a live listing matching ${missing}.`, cars };
  }

  const [a, b] = aRows;
  const [carAResult, carBResult] = cars;
  const toolResultText = [
    `Car A: ${carAResult.title} — ${carAResult.priceLabel}, ${carAResult.mileageLabel}, ${carAResult.transmission}, ${a.fuel}, ${a.city} (id: ${a.id})`,
    `Car B: ${carBResult.title} — ${carBResult.priceLabel}, ${carBResult.mileageLabel}, ${carBResult.transmission}, ${b.fuel}, ${b.city} (id: ${b.id})`,
  ].join("\n");
  return { toolResultText, cars };
}

async function runTool(name: string, input: Record<string, unknown>): Promise<ToolOutcome> {
  if (name === "search_cars") return runSearchCars(input);
  if (name === "compare_cars") return runCompareCars(input);
  return { toolResultText: `Unknown tool: ${name}.`, cars: [] };
}

// --- OpenRouter (OpenAI-compatible) request/response shapes -----------------------

type ORToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

type ORMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ORToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

type ORResponse = {
  choices?: {
    message: { role: "assistant"; content: string | null; tool_calls?: ORToolCall[] };
    finish_reason: string;
  }[];
  error?: { message?: string };
};

async function callOpenRouter(apiKey: string, messages: ORMessage[]): Promise<ORResponse> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "SeedhiDeal Assistant",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      messages,
      tools: TOOLS,
    }),
  });

  const data = (await res.json()) as ORResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenRouter request failed (${res.status}).`);
  }
  return data;
}

/** Runs one turn of the assistant: the full prior conversation in, one reply (plus any
 * real car results surfaced along the way) out. Stateless by design for v1 — the client
 * holds the transcript and resends it each turn, so no new database table is needed to
 * ship this MVP. */
export async function runAssistant(history: ChatMessage[]): Promise<AssistantResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "The AI Assistant isn't configured yet — an administrator needs to add an OPENROUTER_API_KEY.",
    };
  }

  const messages: ORMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m): ORMessage => ({ role: m.role, content: m.content })),
  ];
  const allCars: CarResult[] = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await callOpenRouter(apiKey, messages);
      const message = response.choices?.[0]?.message;
      const toolCalls = message?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const text = (message?.content ?? "").trim();
        return {
          ok: true,
          reply: text || "I'm not sure how to help with that — try asking me to find a car, compare two cars, or how SeedhiDeal works.",
          cars: allCars.length ? allCars : undefined,
        };
      }

      messages.push({ role: "assistant", content: message?.content ?? null, tool_calls: toolCalls });

      for (const call of toolCalls) {
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(call.function.arguments) as Record<string, unknown>;
        } catch {
          // Malformed arguments — fall through with an empty filter set rather than crash.
        }
        const outcome = await runTool(call.function.name, input);
        allCars.push(...outcome.cars);
        messages.push({ role: "tool", tool_call_id: call.id, content: outcome.toolResultText });
      }
    }

    return {
      ok: true,
      reply: "I found some information but I'm having trouble summarizing it — could you rephrase your question?",
      cars: allCars.length ? allCars : undefined,
    };
  } catch (e) {
    console.error("[assistant] request failed:", e);
    return { ok: false, error: "Something went wrong reaching the AI assistant. Please try again." };
  }
}
