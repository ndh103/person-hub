import { Link } from "@/components/link";
import { ArrowRightIcon, LayoutGridIcon } from "lucide-react";
import { HUB_APPS } from "@/components/shell/apps";

/** Post-sign-in landing (SHELL-004): one card per app from the shared registry. */
export function HomePage() {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 id="home-title" tabIndex={-1} className="text-2xl font-bold tracking-tight lg:text-3xl outline-none">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">Choose an app to continue.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Apps">
        {HUB_APPS.map((app) => {
          const Icon = app.icon;
          return (
            <li key={app.id}>
              <Link
                to={app.href}
                className="group flex h-full flex-col rounded-xl border bg-card p-5 text-card-foreground shadow-sm transition-colors outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground" aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <span className="mt-4 text-lg font-semibold">{app.label}</span>
                <span className="mt-1 text-sm text-muted-foreground">{app.description}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-foreground">
                  Open {app.label}
                  <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          );
        })}
        <li className="sm:col-span-2">
          <div className="flex items-center gap-3 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            <LayoutGridIcon aria-hidden="true" className="size-5" />
            More apps will appear here and in the sidebar as they are added.
          </div>
        </li>
      </ul>
    </section>
  );
}
