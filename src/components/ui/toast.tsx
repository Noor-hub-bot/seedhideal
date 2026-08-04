"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; title: string; description?: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (toast: { title: string; description?: string; variant?: ToastVariant }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Fires a toast from any client component under ToastProvider (mounted once in
 * src/app/admin/layout.tsx) — the single place this admin section shows success/error
 * feedback for an action, rather than each feature building its own banner. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const VARIANT_CLASS: Record<ToastVariant, string> = {
  success: "border-brand bg-brand-soft text-brand-soft-ink",
  error: "border-alert bg-alert-soft text-alert-ink",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: { title: string; description?: string; variant?: ToastVariant }) => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), variant: "success", ...toast }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToast.Provider swipeDirection="right" duration={4500}>
        {children}
        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            className={`toast-root rounded-card border p-4 shadow-lg ${VARIANT_CLASS[t.variant]}`}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
          >
            <RadixToast.Title className="text-[13px] font-semibold">{t.title}</RadixToast.Title>
            {t.description && (
              <RadixToast.Description className="mt-1 text-[12px] leading-relaxed">
                {t.description}
              </RadixToast.Description>
            )}
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
