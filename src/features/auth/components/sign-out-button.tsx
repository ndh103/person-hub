"use client";

import { LogOutIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { navigateTo, postAuth } from "../api";

/** AUTH-006: POSTs to sign out (never a GET), then returns to the sign-in page. */
export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    const result = await postAuth<{ redirectTo: string }>("/api/auth/sign-out");
    // Navigate either way: if the call failed, the proxy decides what the user may see.
    navigateTo(result.ok ? result.data.redirectTo : "/sign-in");
  }

  return (
    <Button type="button" variant="ghost" className="h-11" disabled={pending} onClick={onSignOut}>
      <LogOutIcon data-icon="inline-start" />
      Sign out
    </Button>
  );
}
