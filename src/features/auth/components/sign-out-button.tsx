import { LogOutIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navigateTo, signOut } from "../api";

/** AUTH-006: ends this browser's session, then reloads into the sign-in page. */
export function SignOutButton({ className, labelClassName }: { className?: string; labelClassName?: string }) {
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    await signOut();
    navigateTo("/sign-in?signed_out=1");
  }

  return (
    <Button type="button" variant="ghost" className={cn("h-11", className)} disabled={pending} onClick={onSignOut}>
      <LogOutIcon data-icon="inline-start" />
      <span className={labelClassName}>Sign out</span>
    </Button>
  );
}
