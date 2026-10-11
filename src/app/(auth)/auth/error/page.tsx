import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Link expired" };

/** AUTH-009: invalid, expired or already-used email link. */
export default function AuthLinkErrorPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">This link is invalid or has expired</h1>
        </CardTitle>
        <CardDescription>
          Email links work once and expire after a while. Request a new email, or ask the hub owner to send a new
          invitation.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/sign-in" className="text-sm font-medium text-accent-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-accent-foreground underline-offset-4 hover:underline"
        >
          Reset your password
        </Link>
      </CardFooter>
    </Card>
  );
}
