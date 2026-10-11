import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home" };

/** Post-sign-in landing (requirements A1). App cards arrive with the shell implementation. */
export default function HomePage() {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-2">
      <h1 id="home-title" className="text-2xl font-semibold tracking-tight">
        Welcome back
      </h1>
      <p className="text-sm text-muted-foreground">You’re signed in. Finisher and Events are on the way.</p>
    </section>
  );
}
