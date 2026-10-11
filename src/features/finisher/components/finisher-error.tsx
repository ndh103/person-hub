"use client";

import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Error state with Retry (FIN-001). Shows no error detail: server errors
 * reach the browser only as a digest, and never with partial data.
 */
export function FinisherError({ retry }: { retry: () => void }) {
  return (
    <Alert variant="destructive" role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <CircleAlertIcon />
      <div className="flex-1">
        <AlertTitle>Couldn’t load Finisher</AlertTitle>
        <AlertDescription>Check your connection and try again. Your data has not been changed.</AlertDescription>
      </div>
      <Button variant="outline" className="h-11 self-start sm:self-auto" onClick={() => retry()}>
        <RefreshCwIcon data-icon="inline-start" />
        Try again
      </Button>
    </Alert>
  );
}
