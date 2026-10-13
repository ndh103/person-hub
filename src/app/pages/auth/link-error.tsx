import { Link } from "@/components/link";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/** AUTH-009: invalid, expired or already-used email link. */
export function AuthLinkErrorPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-heading text-2xl font-medium">This link is invalid or has expired</h1>
        </CardTitle>
        <CardDescription>
          Email links work once and expire after a while. Request a new email, or ask the hub owner to send a new
          invitation.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-x-6 gap-y-2">
        <Link to="/sign-in" className="text-sm font-medium text-accent-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-accent-foreground underline-offset-4 hover:underline"
        >
          Reset your password
        </Link>
      </CardFooter>
    </Card>
  );
}
