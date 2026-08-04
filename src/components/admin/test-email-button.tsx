"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { sendTestEmailAction } from "@/lib/actions/admin-settings";

export function TestEmailButton() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={isPending}
      className="px-4 py-2 text-[13px]"
      onClick={() =>
        startTransition(async () => {
          const result = await sendTestEmailAction();
          if (result.ok) showToast({ title: "Sent", description: result.message, variant: "success" });
          else showToast({ title: "Couldn't send test email", description: result.error, variant: "error" });
        })
      }
    >
      {isPending ? "Sending…" : "Send test email"}
    </Button>
  );
}
