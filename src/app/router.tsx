import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useMatches,
  type ParsedLocation,
} from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { z } from "zod";
import { finishGoogleSignIn, confirmEmailLink } from "@/features/auth/api";
import type { EventsFilter } from "@/features/events/api";
import { finisherQueries } from "@/features/finisher/api";
import { FinisherRouteError } from "@/features/finisher/components/finisher-error";
import { ListSkeleton } from "@/features/finisher/components/list-parts";
import { ClosedView } from "@/features/finisher/components/views/closed-view";
import { ProjectView } from "@/features/finisher/components/views/project-view";
import { ProjectsView } from "@/features/finisher/components/views/projects-view";
import { TaskView } from "@/features/finisher/components/views/task-view";
import { TasksView } from "@/features/finisher/components/views/tasks-view";
import { TodayView } from "@/features/finisher/components/views/today-view";
import { TaskPanelLayout } from "@/features/finisher/components/task-panel";
import { DEFAULT_NEXT } from "@/lib/auth/safe-next";
import { parseConfirmType } from "@/lib/auth/validation";
import { sessionStatus } from "@/lib/supabase/client";
import { AppLayout, ContentSkeleton } from "./layouts/app-layout";
import { AuthLayout } from "./layouts/auth-layout";
import { CompletingSignInPage } from "./pages/auth/completing";
import { ForgotPasswordPage } from "./pages/auth/forgot-password";
import { AuthLinkErrorPage } from "./pages/auth/link-error";
import { SetPasswordPage } from "./pages/auth/set-password";
import { SignInPage } from "./pages/auth/sign-in";
import { EventsPage } from "./pages/events";
import { EditProjectPage } from "./pages/finisher/project-edit";
import { NewProjectPage } from "./pages/finisher/project-new";
import { FinisherTabsLayout } from "./pages/finisher/tabs-layout";
import { HomePage } from "./pages/home";
import { NotFoundPage } from "./pages/not-found";

export type RouterContext = { queryClient: QueryClient };

/** Query-string values are bounded; anything unexpected is dropped rather than rejected. */
const optionalText = (max: number) => z.string().max(max).optional().catch(undefined);

// The task open in the laptop side panel (FIN-036, A12). Anything but a UUID is dropped.
const panelTask = { task: z.uuid().optional().catch(undefined) };

// ---------------------------------------------------------------------------
// Root: document title from the deepest route that names one
// ---------------------------------------------------------------------------

function DocumentTitle() {
  const title = useMatches({
    select: (matches) => matches.findLast((match) => match.staticData.title)?.staticData.title,
  });
  useEffect(() => {
    // Page titles stay generic: task and project titles are personal and kept out of history and tab lists.
    document.title = title ? `${title} · Personal Hub` : "Personal Hub";
  }, [title]);
  return null;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <DocumentTitle />
      <Outlet />
    </>
  ),
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: DEFAULT_NEXT });
  },
});

// ---------------------------------------------------------------------------
// Sign-in pages (outside the shell, AUTH-010)
// ---------------------------------------------------------------------------

/** Signed-in visitors skip the sign-in pages (AUTH-007). */
async function redirectIfSignedIn() {
  if ((await sessionStatus()).session) throw redirect({ to: DEFAULT_NEXT });
}

const authLayout = createRoute({ getParentRoute: () => rootRoute, id: "auth", component: AuthLayout });

const signInRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "sign-in",
  staticData: { title: "Sign in" },
  validateSearch: z.object({
    next: optionalText(2048),
    error: optionalText(32),
    reason: optionalText(32),
    signed_out: optionalText(4),
  }),
  beforeLoad: redirectIfSignedIn,
  component: function SignIn() {
    return <SignInPage search={signInRoute.useSearch()} />;
  },
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "forgot-password",
  staticData: { title: "Forgot password" },
  beforeLoad: redirectIfSignedIn,
  component: ForgotPasswordPage,
});

const setPasswordRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "account/set-password",
  staticData: { title: "Set password" },
  beforeLoad: async () => {
    const { session } = await sessionStatus();
    if (!session) throw redirect({ to: "/sign-in", search: { next: "/account/set-password" } });
    return { email: session.user.email ?? null };
  },
  component: function SetPassword() {
    return <SetPasswordPage email={setPasswordRoute.useRouteContext({ select: (context) => context.email })} />;
  },
});

const linkErrorRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "auth/error",
  staticData: { title: "Link expired" },
  component: AuthLinkErrorPage,
});

/**
 * Email links and the Google return each carry a single-use secret. The
 * exchange runs once per secret, even if the route loads again (a retried
 * navigation or React's development double render), and then replaces the
 * URL, so the secret stays out of the history.
 */
const completions = new Map<string, Promise<string>>();

function completeOnce(key: string, run: () => Promise<string>): Promise<string> {
  let pending = completions.get(key);
  if (!pending) {
    pending = run();
    completions.set(key, pending);
  }
  return pending;
}

/** GET /auth/confirm?token_hash&type&next: magic link, invitation, password reset (AUTH-002, 004, 005, 009). */
const confirmRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "auth/confirm",
  staticData: { title: "Signing in" },
  validateSearch: z.object({ token_hash: optionalText(512), type: optionalText(16), next: optionalText(2048) }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const type = parseConfirmType(deps.type);
    const tokenHash = deps.token_hash;
    const target =
      tokenHash && type
        ? await completeOnce(`confirm:${tokenHash}`, async () => {
            const result = await confirmEmailLink(tokenHash, type, deps.next);
            return result.ok ? result.data.redirectTo : "/auth/error";
          })
        : "/auth/error";
    window.location.replace(target);
  },
  component: CompletingSignInPage,
});

/** GET /auth/callback?code&next (or ?error=…): the Google return (AUTH-003). */
const callbackRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "auth/callback",
  staticData: { title: "Signing in" },
  validateSearch: z.object({
    code: optionalText(512),
    error: optionalText(64),
    error_code: optionalText(64),
    error_description: optionalText(512),
    next: optionalText(2048),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const target = await completeOnce(`callback:${deps.code ?? deps.error ?? ""}`, async () => {
      const { redirectTo } = await finishGoogleSignIn({
        code: deps.code,
        error: deps.error,
        errorCode: deps.error_code,
        errorDescription: deps.error_description,
        next: deps.next,
      });
      return redirectTo;
    });
    window.location.replace(target);
  },
  component: CompletingSignInPage,
});

// ---------------------------------------------------------------------------
// Signed-in shell
// ---------------------------------------------------------------------------

/**
 * Signed-out visitors go to sign-in and come back afterwards (AUTH-007). A
 * convenience, not a control: the API checks the access token itself.
 */
async function requireSession({ location }: { location: ParsedLocation }) {
  const { session, expired } = await sessionStatus();
  if (!session) {
    throw redirect({
      to: "/sign-in",
      search: { next: location.href === "/" ? undefined : location.href, reason: expired ? "expired" : undefined },
    });
  }
  return { account: session.user.email ?? null };
}

const appLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: requireSession,
  pendingComponent: ContentSkeleton,
  component: function App() {
    return <AppLayout account={appLayout.useRouteContext({ select: (context) => context.account })} />;
  },
});

const homeRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "home",
  staticData: { title: "Home" },
  component: HomePage,
});

// Events (EVT-001). Search text and year stay in the page URL (EVT-009); the
// API receives them in a POST body, never in its own URL (EVT-007).
const eventsRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "events",
  staticData: { title: "Events" },
  validateSearch: z.object({
    q: optionalText(100),
    year: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
  }),
  component: function Events() {
    const search = eventsRoute.useSearch();
    const navigate = eventsRoute.useNavigate();
    const onFilterChange = useCallback(
      (next: EventsFilter, options?: { replace?: boolean }) =>
        void navigate({ search: { q: next.q || undefined, year: next.year }, replace: options?.replace }),
      [navigate],
    );
    return <EventsPage filter={search} onFilterChange={onFilterChange} />;
  },
});

// Finisher (FIN-001). Each page preloads its data in the loader and renders
// from the same query, so cached data shows at once and refreshes behind it.

const finisherTabs = createRoute({
  getParentRoute: () => appLayout,
  id: "finisher-tabs",
  component: FinisherTabsLayout,
  errorComponent: FinisherRouteError,
});

const todayRoute = createRoute({
  getParentRoute: () => finisherTabs,
  path: "finisher",
  staticData: { title: "Finisher" },
  validateSearch: z.object(panelTask),
  loader: ({ context }) => context.queryClient.ensureQueryData(finisherQueries.today()),
  pendingComponent: () => <ListSkeleton label="Loading today’s plan…" />,
  errorComponent: FinisherRouteError,
  component: TodayView,
});

const tasksRoute = createRoute({
  getParentRoute: () => finisherTabs,
  path: "finisher/tasks",
  staticData: { title: "Tasks · Finisher" },
  validateSearch: z.object({ project: optionalText(64), ...panelTask }),
  loaderDeps: ({ search }) => ({ project: search.project }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(finisherQueries.tasks(deps.project)),
  pendingComponent: () => <ListSkeleton label="Loading tasks…" />,
  errorComponent: FinisherRouteError,
  component: function Tasks() {
    return <TasksView project={tasksRoute.useSearch({ select: (search) => search.project })} />;
  },
});

const projectsRoute = createRoute({
  getParentRoute: () => finisherTabs,
  path: "finisher/projects",
  staticData: { title: "Projects · Finisher" },
  loader: ({ context }) => context.queryClient.ensureQueryData(finisherQueries.projects()),
  pendingComponent: () => <ListSkeleton label="Loading projects…" />,
  errorComponent: FinisherRouteError,
  component: ProjectsView,
});

const closedRoute = createRoute({
  getParentRoute: () => finisherTabs,
  path: "finisher/closed",
  staticData: { title: "Closed · Finisher" },
  validateSearch: z.object({
    type: z.enum(["tasks", "projects"]).optional().catch(undefined),
    outcome: z.enum(["completed", "delegated", "let_go"]).optional().catch(undefined),
    ...panelTask,
  }),
  loaderDeps: ({ search }) => ({ type: search.type, outcome: search.outcome }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(finisherQueries.closed(deps.type, deps.outcome)),
  pendingComponent: () => <ListSkeleton label="Loading closed items…" />,
  errorComponent: FinisherRouteError,
  component: function Closed() {
    const { type, outcome } = closedRoute.useSearch();
    return <ClosedView type={type} outcome={outcome} />;
  },
});

const newProjectRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "finisher/projects/new",
  staticData: { title: "New project · Finisher" },
  errorComponent: FinisherRouteError,
  component: NewProjectPage,
});

// Generic titles: project and task titles are personal and stay out of the document title.
const projectRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "finisher/projects/$id",
  staticData: { title: "Project · Finisher" },
  validateSearch: z.object(panelTask),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(finisherQueries.project(params.id)),
  pendingComponent: () => <ListSkeleton label="Loading project…" />,
  errorComponent: FinisherRouteError,
  component: function Project() {
    return (
      <TaskPanelLayout>
        <ProjectView id={projectRoute.useParams({ select: (params) => params.id })} />
      </TaskPanelLayout>
    );
  },
});

const editProjectRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "finisher/projects/$id/edit",
  staticData: { title: "Edit project · Finisher" },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(finisherQueries.project(params.id)),
  pendingComponent: () => <ListSkeleton label="Loading project…" rows={2} />,
  errorComponent: FinisherRouteError,
  component: function EditProject() {
    return <EditProjectPage id={editProjectRoute.useParams({ select: (params) => params.id })} />;
  },
});

const taskRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "finisher/tasks/$id",
  staticData: { title: "Task · Finisher" },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(finisherQueries.task(params.id)),
  pendingComponent: () => <ListSkeleton label="Loading task…" rows={1} />,
  errorComponent: FinisherRouteError,
  component: function Task() {
    return <TaskView id={taskRoute.useParams({ select: (params) => params.id })} />;
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authLayout.addChildren([signInRoute, forgotPasswordRoute, setPasswordRoute, linkErrorRoute, confirmRoute, callbackRoute]),
  appLayout.addChildren([
    homeRoute,
    eventsRoute,
    finisherTabs.addChildren([todayRoute, tasksRoute, projectsRoute, closedRoute]),
    newProjectRoute,
    projectRoute,
    editProjectRoute,
    taskRoute,
  ]),
]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    // Data freshness is TanStack Query's job; loaders always ask it.
    defaultPreloadStaleTime: 0,
    defaultPreload: "intent",
    // Keep the current page briefly while the next one loads, then show its skeleton.
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
  interface StaticDataRouteOption {
    title?: string;
  }
}
