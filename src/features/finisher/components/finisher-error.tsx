import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Error state with Retry (FIN-001). Shows no error detail: the API returns
 * only safe codes, and a failed view never renders partial data.
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

/**
 * Route error boundary for Finisher pages: clears the failed queries, and
 * Retry reloads the page's data.
 */
export function FinisherRouteError() {
  const router = useRouter();
  const queryErrors = useQueryErrorResetBoundary();
  useEffect(() => queryErrors.reset(), [queryErrors]);
  return <FinisherError retry={() => void router.invalidate()} />;
}
