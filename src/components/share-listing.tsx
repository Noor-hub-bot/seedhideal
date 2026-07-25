"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ShareListing({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard copy
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="secondary" onClick={handleShare} className="px-4 py-2 text-sm">
      {copied ? "✓ Link copied" : "Share"}
    </Button>
  );
}
