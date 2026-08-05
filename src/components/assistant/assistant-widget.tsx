"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge, Button, Input } from "@/components/ui";
import type { CarResult } from "@/lib/ai/assistant";
import { ChatBubbleIcon, CloseIcon, SendIcon, SparkleIcon } from "./icons";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  cars?: CarResult[];
  isError?: boolean;
};

const SUGGESTED_PROMPTS = [
  "Find cars under my budget",
  "Compare two cars",
  "Recommend a family car",
  "Help me post my car",
  "Explain verified sellers",
];

let nextId = 0;
function newId(): string {
  nextId += 1;
  return `m${nextId}-${Date.now()}`;
}

/** The floating "SeedhiDeal Assistant" — a scoped marketplace helper, not a general
 * chat clone (see src/lib/ai/assistant.ts for the tool-calling design this renders).
 * Conversation state lives only in this component (resets on reload) — a deliberate v1
 * scope choice, not an oversight; see the commit message for why. */
export function AssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, messages, pending]);

  // A marketplace helper for buyers/sellers, not an admin tool — and the admin panel
  // already has its own toast system anchored bottom-right (components/ui/toast.tsx),
  // which this would otherwise sit directly on top of.
  if (pathname?.startsWith("/admin")) return null;

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const userMessage: Message = { id: newId(), role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue("");
    setPending(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data: { ok: boolean; reply?: string; cars?: CarResult[]; error?: string } = await res.json();
      if (data.ok) {
        setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: data.reply ?? "", cars: data.cars }]);
      } else {
        setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: data.error ?? "Something went wrong.", isError: true }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: "Couldn't reach the assistant — check your connection and try again.", isError: true },
      ]);
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(inputValue);
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="SeedhiDeal Assistant"
          className="fixed inset-4 z-[80] flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-lg sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[580px] sm:w-[380px]"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-brand px-4 py-3.5 text-white">
            <div className="flex items-center gap-2">
              <SparkleIcon className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-[14px] font-semibold leading-tight">SeedhiDeal Assistant</p>
                <p className="text-[11px] text-brand-soft">Find, compare, and post cars — ask away</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="shrink-0 rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-muted">
                  Hi! I can help you find a car, compare two listings, get a recommendation, write a listing description, or explain how SeedhiDeal works.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => sendMessage(p)}
                      className="rounded-full border border-border-input bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {pending && (
              <div className="flex items-center gap-1.5 rounded-card bg-neutral-chip px-3.5 py-2.5 text-[12px] text-muted" role="status" aria-live="polite">
                <span className="assistant-typing-dot" />
                <span className="assistant-typing-dot" />
                <span className="assistant-typing-dot" />
                <span className="sr-only">Assistant is typing…</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-border p-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about a car, or how SeedhiDeal works…"
              maxLength={1000}
              disabled={pending}
              className="py-2.5 text-[13px]"
              aria-label="Message"
            />
            <Button type="submit" disabled={pending || !inputValue.trim()} className="shrink-0 px-3.5 py-2.5">
              <SendIcon className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close SeedhiDeal Assistant" : "Open SeedhiDeal Assistant"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:bottom-6 sm:right-6"
      >
        {open ? <CloseIcon className="h-5 w-5" /> : <ChatBubbleIcon className="h-6 w-6" />}
      </button>
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] space-y-2.5 ${isUser ? "" : "w-full"}`}>
        <div
          className={`rounded-card px-3.5 py-2.5 text-[13px] leading-relaxed ${
            isUser
              ? "bg-brand text-white"
              : message.isError
                ? "bg-alert-soft text-alert-ink"
                : "bg-neutral-chip text-foreground"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.cars && message.cars.length > 0 && (
          <div className="space-y-2">
            {message.cars.map((car) => (
              <CarResultCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CarResultCard({ car }: { car: CarResult }) {
  return (
    <Link
      href={car.href}
      className="flex items-center gap-3 rounded-input border border-border bg-surface p-2.5 transition-colors hover:border-brand"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-input bg-neutral-chip">
        {car.photo ? (
          <Image src={car.photo} alt={car.title} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="photo-placeholder h-full w-full text-[7px]">no photo</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold">{car.title}</p>
        <p className="truncate text-[11.5px] text-muted">
          {car.city} · {car.mileageLabel} · {car.transmission}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12.5px] font-semibold text-brand">{car.priceLabel}</p>
        <Badge tone="neutral" className="mt-0.5 px-1.5 py-0.5 text-[9.5px]">
          View
        </Badge>
      </div>
    </Link>
  );
}
