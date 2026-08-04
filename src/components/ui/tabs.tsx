"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

// Settings page tab switcher — the one place in this admin panel with enough distinct
// sections (9) that plain conditional rendering or separate routes would be worse than a
// real tab widget. Styled with this project's existing tokens (same underline-tab
// language as AdminNav) rather than Radix's defaults.
export function Tabs({
  defaultValue,
  children,
  className = "",
}: {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixTabs.Root defaultValue={defaultValue} className={className}>
      {children}
    </RadixTabs.Root>
  );
}

export function TabsList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <RadixTabs.List className={`-mx-6 flex gap-1 overflow-x-auto border-b border-border px-6 sm:mx-0 sm:px-0 ${className}`}>
      {children}
    </RadixTabs.List>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RadixTabs.Trigger
      value={value}
      className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-[14px] font-semibold text-muted transition-colors hover:text-foreground data-[state=active]:border-brand data-[state=active]:text-foreground"
    >
      {children}
    </RadixTabs.Trigger>
  );
}

export function TabsContent({ value, children, className = "" }: { value: string; children: ReactNode; className?: string }) {
  return (
    <RadixTabs.Content value={value} className={`pt-6 focus-visible:outline-none ${className}`}>
      {children}
    </RadixTabs.Content>
  );
}
