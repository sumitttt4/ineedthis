"use client";

import { useEffect } from "react";
import Button from "@/components/_ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
        Something broke on our side
      </h1>
      <p className="max-w-sm text-[14px] text-muted-foreground">
        Your files were not uploaded anywhere. Reload the studio and try again — if it keeps
        happening, a smaller file or a different browser usually helps.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={reset}>
          Try again
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </main>
  );
}
