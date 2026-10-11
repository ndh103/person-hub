"use client";

import { LogOutIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navigateTo, postAuth } from "../api";

/** AUTH-006: POSTs to sign out (never a GET), then returns to the sign-in page. */
export function SignOutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    const result = await postAuth<{ redirectTo: string }>("/api/auth/sign-out");
    // Navigate either way: if the call failed, the proxy decides what the user may see.
    navigateTo(result.ok ? result.data.redirectTo : "/sign-in");
  }

  return (
    <Button type="button" variant="ghost" className={cn("h-11", className)} disabled={pending} onClick={onSignOut}>
      <LogOutIcon data-icon="inline-start" />
      Sign out
    </Button>
  );
}
