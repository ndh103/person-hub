import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";

/** Any path the router doesn't know. */
export function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-10 text-center text-foreground">
      <h1 className="font-heading text-3xl font-medium lg:text-4xl">Page not found</h1>
      <p className="text-sm text-muted-foreground">The link may be wrong, or the page may have moved.</p>
      <Button className="h-11" nativeButton={false} render={<Link to="/home" />}>
        Go to Home
      </Button>
    </main>
  );
}
