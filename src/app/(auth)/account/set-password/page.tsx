import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { getSessionUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Set password" };

/** AUTH-004 / AUTH-005: reached from an invitation or reset link, which signs the user in first. */
export default function SetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">Set your password</h1>
        </CardTitle>
        <CardDescription>You’ll use it with your email to sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <SignedInForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function SignedInForm() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/account/set-password");
  return <SetPasswordForm email={user.email} />;
}
