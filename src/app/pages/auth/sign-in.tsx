import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import type { SignInSearch } from "@/features/auth/messages";

export function SignInPage({ search }: { search: SignInSearch }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-heading text-2xl font-medium">Sign in</h1>
        </CardTitle>
        <CardDescription>Access is by invitation only.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm search={search} />
      </CardContent>
    </Card>
  );
}
