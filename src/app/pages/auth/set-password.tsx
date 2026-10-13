import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";

/**
 * AUTH-004 / AUTH-005: reached from an invitation or reset link, which signs
 * the user in first. The route requires a session (src/app/router.tsx).
 */
export function SetPasswordPage({ email }: { email: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-heading text-2xl font-medium">Set your password</h1>
        </CardTitle>
        <CardDescription>You’ll use it with your email to sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <SetPasswordForm email={email} />
      </CardContent>
    </Card>
  );
}
