import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { AlertCircleIcon, PencilIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/components/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { finisherQueries } from "../api";
import { isUuid } from "../domain/validation";
import { TASK_STATUS_LABEL } from "../messages";
import { TaskPanelContext, type TaskPanelApi } from "./task-panel-context";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskActionsMenu, TaskCheck, TaskDue } from "./task-row";
import { TaskFacts } from "./views/task-view";

/**
 * FIN-036: on laptop, a task opens in a panel beside the list instead of on
 * its own page. The open task is the `task` search parameter of the current
 * route (A12): reload reopens it and Back closes it. The first open pushes a
 * history entry; switching tasks replaces it. Below 1024px there is no panel
 * and a stale parameter is dropped (A17).
 *
 * The wrapper keeps the same element structure whether or not the panel is
 * open, so opening it never remounts the list (scroll position, loaded pages).
 */
export function TaskPanelLayout({ children }: { children: React.ReactNode }) {
  const desktop = !useIsMobile();
  const navigate = useNavigate();
  const router = useRouter();
  const raw = useSearch({ strict: false, select: (search: Record<string, unknown>) => search.task });
  const taskId = isUuid(raw) ? raw.toLowerCase() : null;
  const selectedId = desktop ? taskId : null;
  const pushed = useRef(false);

  const setTask = useCallback(
    (id: string | null, replace: boolean) => {
      // Relative navigation that only changes the search; the route's validateSearch allows `task`.
      void navigate({
        to: ".",
        search: (previous: Record<string, unknown>) => ({ ...previous, task: id ?? undefined }),
        replace,
      } as never);
    },
    [navigate],
  );

  const api = useMemo<TaskPanelApi>(
    () => ({
      enabled: desktop,
      selectedId,
      open: (id) => {
        if (id === taskId) {
          document.getElementById("task-panel-title")?.focus();
          return;
        }
        if (!taskId) pushed.current = true;
        setTask(id, taskId !== null);
      },
      close: () => {
        if (pushed.current) {
          pushed.current = false;
          router.history.back();
        } else {
          setTask(null, true);
        }
      },
    }),
    [desktop, selectedId, taskId, setTask, router],
  );

  // The window narrowed below 1024px with the panel open: close it (A17).
  useEffect(() => {
    if (!desktop && taskId) {
      pushed.current = false;
      setTask(null, true);
    }
  }, [desktop, taskId, setTask]);

  // After the panel closes (✕, Escape, Back, delete), return focus to the task in
  // the list, or to the page heading when that task is no longer listed.
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const closed = previous.current;
    previous.current = selectedId;
    if (!closed || selectedId) return;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && active.isConnected) return;
      const title = document.querySelector<HTMLElement>(`[data-task-title="${closed}"]`);
      (title ?? document.querySelector<HTMLElement>("main h1[tabindex='-1']"))?.focus();
    });
  }, [selectedId]);

  return (
    <TaskPanelContext.Provider value={api}>
      <div
        data-task-panel-open={selectedId ? "" : undefined}
        className={cn(
          selectedId &&
            "grid grid-cols-[minmax(0,1fr)_18rem] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]",
        )}
      >
        <div className="min-w-0">{children}</div>
        {selectedId ? <TaskPanel id={selectedId} onClose={api.close} /> : null}
      </div>
    </TaskPanelContext.Provider>
  );
}

/** The panel itself: a non-modal labelled region with the task page's content. */
function TaskPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery(finisherQueries.task(id));
  const asideRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [editing, setEditing] = useState(false);

  // Focus moves to the title whenever a task opens in the panel.
  useEffect(() => {
    titleRef.current?.focus();
  }, [id]);

  // Escape inside the panel closes it. A native listener on the panel's own DOM,
  // so Escape in a menu or dialog (portalled elsewhere) only closes that.
  useEffect(() => {
    const element = asideRef.current;
    if (!element) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onClose();
      }
    }
    element.addEventListener("keydown", onKeyDown);
    return () => element.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const data = query.data;
  const task = data?.task;
  const heading = query.isPending
    ? null
    : query.isError
      ? "Couldn’t load this task"
      : task
        ? task.title
        : "This task no longer exists";

  return (
    <aside
      ref={asideRef}
      aria-labelledby="task-panel-title"
      className="sticky top-5 max-h-[calc(100dvh-2.5rem)] overflow-y-auto overscroll-contain rounded-2xl border bg-card px-5 pt-3 pb-5 text-card-foreground"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-medium tracking-[0.12em] text-accent-foreground uppercase">Task</p>
        <div className="-mr-2 flex items-center">
          {data && task ? (
            <TaskActionsMenu task={task} today={data.today} projects={data.projects} editTask={task} onDeleted={onClose} />
          ) : null}
          <Button variant="ghost" size="icon-lg" className="size-11 text-muted-foreground" aria-label="Close task details" onClick={onClose}>
            <XIcon />
          </Button>
        </div>
      </div>

      <h2 id="task-panel-title" ref={titleRef} tabIndex={-1} className="font-heading text-2xl font-medium break-words outline-none">
        {heading ?? (
          <>
            <span className="sr-only">Loading task…</span>
            <Skeleton aria-hidden="true" className="h-7 w-3/4" />
          </>
        )}
      </h2>

      {query.isPending ? (
        <div aria-hidden="true" className="mt-3 flex flex-col gap-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : query.isError ? (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p role="alert" className="flex gap-2 rounded-lg border border-destructive/40 p-3 text-sm">
            <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span className="text-muted-foreground">Check your connection and try again.</span>
          </p>
          <Button variant="outline" className="h-11" onClick={() => void query.refetch()}>
            <RefreshCwIcon data-icon="inline-start" />
            Retry
          </Button>
        </div>
      ) : !data || !task ? (
        // Deleted elsewhere, or another account's task: indistinguishable (FIN-017).
        <p className="mt-2 text-sm text-muted-foreground">It may have been deleted on another device.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={task.status === "open" ? "secondary" : "outline"}>{TASK_STATUS_LABEL[task.status]}</Badge>
            <span className="font-mono text-[0.8125rem] text-muted-foreground">
              <TaskDue task={task} today={data.today} />
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {task.status !== "let_go" ? <TaskCheck task={task} variant="labelled" /> : null}
            {task.status === "open" || task.status === "parked" ? (
              <Button variant="outline" className="h-11" onClick={() => setEditing(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            ) : null}
          </div>
          <TaskFacts task={task} className="mt-5 grid-cols-[auto_minmax(0,1fr)] border-t pt-4 sm:grid-cols-[auto_minmax(0,1fr)]" />
          <p className="mt-5 text-xs text-muted-foreground">
            <Link to="/finisher/tasks/$id" params={{ id: task.id }} className="underline underline-offset-4">
              Open full page
            </Link>
          </p>
          <TaskFormDialog open={editing} onOpenChange={setEditing} today={data.today} projects={data.projects} task={task} />
        </>
      )}
    </aside>
  );
}
