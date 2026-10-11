import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Full-width primary submit with a 44px touch target and a pending state. */
export function SubmitButton({
  pending,
  children,
  pendingLabel,
  variant = "default",
  type = "submit",
  onClick,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "default" | "outline";
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <Button type={type} variant={variant} size="lg" className="h-11 w-full" disabled={pending} onClick={onClick}>
      {pending ? (
        <>
          <Spinner data-icon="inline-start" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
