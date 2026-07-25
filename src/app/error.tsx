"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Heading } from "@/components/ui";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <Heading size="lg" className="mb-3">
        Something went wrong
      </Heading>
      <p className="mb-8 text-sm text-muted">
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => unstable_retry()}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
