import { CircleAlertIcon, InfoIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Page-level message for a form. Errors are announced assertively, notices politely. */
export function FormAlert({ tone, children }: { tone: "info" | "error"; children: React.ReactNode }) {
  if (tone === "error") {
    return (
      <Alert variant="destructive" role="alert">
        <CircleAlertIcon />
        <AlertDescription>{children}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert role="status">
      <InfoIcon />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
