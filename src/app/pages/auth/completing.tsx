import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

/** Shown while an email link or the Google return is being exchanged for a session. */
export function CompletingSignInPage() {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <CardTitle>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Spinner aria-hidden="true" />
            Signing you in…
          </h1>
        </CardTitle>
        <CardDescription role="status">This takes a moment.</CardDescription>
      </CardHeader>
    </Card>
  );
}
