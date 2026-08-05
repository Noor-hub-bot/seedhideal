// Public endpoint (no sign-in required — search/recommend/FAQ/description-help are all
// safe without an account, same call as browsing /cars). Rate-limited per IP since this
// calls a paid external API on every request — the one place in this codebase that's
// genuinely necessary beyond the existing auth-flow limits.
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { runAssistant, type ChatMessage } from "@/lib/ai/assistant";

const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 1000;

function isValidHistory(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_HISTORY &&
    value.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0 &&
        m.content.length <= MAX_MESSAGE_LENGTH,
    )
  );
}

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  if (!checkRateLimit(`assistant:ip:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many messages — please wait a few minutes and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!isValidHistory(messages)) {
    return NextResponse.json({ ok: false, error: "Invalid message history." }, { status: 400 });
  }

  const result = await runAssistant(messages);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
