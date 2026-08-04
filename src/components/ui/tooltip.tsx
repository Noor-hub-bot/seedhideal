"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";

// A thin wrapper around Radix's Tooltip primitive (the only genuinely new UI
// dependency this admin dashboard needed — everything else reuses src/components/ui.tsx
// as-is). Styled with this project's existing design tokens (bg-foreground/text-background,
// rounded-input, the same shadow scale as Card), not shadcn's default color scheme, so it
// reads as part of the same design system rather than a bolted-on component.
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <RadixTooltip.Provider delayDuration={200}>{children}</RadixTooltip.Provider>;
}

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 rounded-input bg-foreground px-2.5 py-1.5 text-[12px] font-medium text-background shadow-lg"
        >
          {content}
          <RadixTooltip.Arrow className="fill-foreground" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
