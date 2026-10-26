import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { FlagIcon, GripVerticalIcon, InboxIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { browserTimeZone, finisherApi } from "../../api";
import {
  addDays,
  DEFAULT_TIME_ZONE,
  formatDate,
  formatWeekdayDate,
  isOverdue,
  startOfNextWeek,
  startOfWeek,
  weekdayShort,
  isoWeekday,
  zonedNow,
  type LocalDate,
  type LocalTime,
} from "../../domain/dates";
import { canPlanOn, dayToDoCount, formatDayShort, isWeekendDay, orderDayItems, timeAfterMove, type PlanTarget } from "../../domain/week";
import { generalErrorMessage } from "../../messages";
import type { DueChangesResult, TaskItem, WeekData } from "../../types";
import { AddTaskButton } from "../add-task-button";
import { EmptyState } from "../list-parts";
import { useTaskPanel } from "../task-panel-context";
import { TaskFormDialog } from "../task-form-dialog";
import { useFinisherRefresh } from "../use-refresh";
import { MoveToDayDialog, SetTimeDialog } from "./plan-dialogs";
import { PlanSessionCard, PlanTaskCard } from "./week-cards";
import { focusWeekTask, useWeekPlan, WeekPlanContext, type FocusTarget, type WeekPlanApi } from "./week-plan-context";

type Due = { dueDate: LocalDate | null; dueTime: LocalTime | null };

/** Lists show this many tasks, then "Show more" (TD-FIN-1). */
const PAGE = 50;

function browserNow() {
  return zonedNow(browserTimeZone() ?? DEFAULT_TIME_ZONE);
}

/** "Wednesday 28 Oct", with the year when the date is outside the week shown. */
function dayWords(date: LocalDate, weekStart: LocalDate): string {
  const inWeek = date >= weekStart && date <= addDays(weekStart, 6);
  return inWeek ? formatWeekdayDate(date) : `${formatWeekdayDate(date)} ${date.slice(0, 4)}`;
}

function targetName(target: UniqueIdentifier): string {
  return target === "unplanned" ? "Unplanned" : formatWeekdayDate(String(target));
}

/**
 * Every open task the board received, placed by its due date with pending
 * moves applied: no date → Unplanned; before today in the current week →
 * Carried over (FIN-046); a day of this week → that day. A moved task goes to
 * the end of its new place, as the server will put it (FIN-038).
 */
function placeTasks(data: WeekData, overrides: Map<string, Due>, current: boolean) {
  const seen = new Set<string>();
  const all = [...(data.carried?.items ?? []), ...data.days.flatMap((day) => day.open), ...data.unplanned.items].filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
  const staying = all.filter((task) => !overrides.has(task.id));
  const moved = all
    .filter((task) => overrides.has(task.id))
    .map((task) => {
      const due = overrides.get(task.id)!;
      return { ...task, ...due, overdue: isOverdue(due.dueDate, due.dueTime, data.now) };
    });

  const days = new Map<LocalDate, TaskItem[]>(data.days.map((day) => [day.date, []]));
  const unplanned: TaskItem[] = [];
  const carried: TaskItem[] = [];
  for (const task of [...staying, ...moved]) {
    if (!task.dueDate) unplanned.push(task);
    else if (current && task.dueDate < data.now.date) carried.push(task);
    else days.get(task.dueDate)?.push(task);
  }
  return { days, unplanned, carried, all };
}

/** The column under the pointer, else the column the card overlaps most. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/**
 * The Plan view (FIN-043 to FIN-046). Moves show at once through local
 * overrides, are saved through the due-date endpoints, and are put back with
 * an error message if saving fails. Undo restores the previous date and time.
 */
export function WeekBoard({ data, showDone, showWeekend }: { data: WeekData; showDone: boolean; showWeekend: boolean }) {
  const refresh = useFinisherRefresh();
  const mobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const panel = useTaskPanel();
  const today = data.now.date;
  const current = data.weekStart === startOfWeek(today);

  const [overrides, setOverrides] = useState<Map<string, Due>>(() => new Map());
  const [moveFor, setMoveFor] = useState<TaskItem | null>(null);
  const [timeFor, setTimeFor] = useState<TaskItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickedDay, setPickedDay] = useState<LocalDate | null>(null);
  const [unplannedOpen, setUnplannedOpen] = useState(() => window.innerWidth >= 1400);
  const [shown, setShown] = useState({ unplanned: PAGE, carried: PAGE });

  const placed = useMemo(() => placeTasks(data, overrides, current), [data, overrides, current]);
  // Saturday and Sunday are hidden unless Show weekend is on (decision 41). Their tasks still count and can be moved there.
  const visibleDays = showWeekend ? data.days : data.days.filter((day) => !isWeekendDay(day.date));
  const dates = visibleDays.map((day) => day.date);
  const selectedDay = pickedDay && dates.includes(pickedDay) ? pickedDay : current && dates.includes(today) ? today : dates[0];
  // With the side panel open, Unplanned folds away so the seven days stay readable (design notes).
  const unplannedCollapsed = !unplannedOpen || Boolean(panel?.selectedId);

  const setOverride = useCallback((entries: [string, Due | null][]) => {
    setOverrides((previous) => {
      const next = new Map(previous);
      for (const [id, due] of entries) {
        if (due) next.set(id, due);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const saveDue = useCallback(
    (id: string, due: Due) => finisherApi("PUT", `/api/finisher/tasks/${id}/due`, { dueDate: due.dueDate, dueTime: due.dueTime }),
    [],
  );

  /** One task's new date or time: shown at once, saved, Undo restores the previous values. */
  const change = useCallback(
    async (task: TaskItem, next: Due, message: string, focus: FocusTarget) => {
      const previous: Due = { dueDate: task.dueDate, dueTime: task.dueTime };
      setOverride([[task.id, next]]);
      focusWeekTask(task.id, focus);
      const result = await saveDue(task.id, next);
      if (!result.ok) {
        setOverride([[task.id, null]]);
        focusWeekTask(task.id, focus);
        toast.add({ title: `Couldn’t move “${task.title}”`, description: generalErrorMessage(result.error), type: "error" });
        return;
      }
      toast.add({
        title: message,
        type: "success",
        actionProps: {
          children: "Undo",
          onClick: () => {
            setOverride([[task.id, previous]]);
            void saveDue(task.id, previous).then(async (undo) => {
              if (!undo.ok) toast.add({ title: "Couldn’t undo the change", description: generalErrorMessage(undo.error), type: "error" });
              await refresh();
              setOverride([[task.id, null]]);
              focusWeekTask(task.id, "title");
            });
          },
        },
      });
      await refresh();
      setOverride([[task.id, null]]);
    },
    [refresh, saveDue, setOverride],
  );

  const move = useCallback(
    (task: TaskItem, date: LocalDate | null, focus: FocusTarget) => {
      const time = timeAfterMove(task, date, browserNow());
      return change(task, { dueDate: date, dueTime: time }, date ? `Moved to ${dayWords(date, data.weekStart)}` : "Moved to Unplanned", focus);
    },
    [change, data.weekStart],
  );

  const setTime = useCallback(
    (task: TaskItem, time: LocalTime | null) =>
      change(
        task,
        { dueDate: task.dueDate, dueTime: time },
        time && task.dueDate ? `Set for ${time} on ${dayWords(task.dueDate, data.weekStart)}` : "Time cleared",
        "more",
      ),
    [change, data.weekStart],
  );

  /** "Move all" (FIN-046, FIN-047): one batch call; a partial failure says how many stayed. */
  const moveAll = useCallback(
    async (tasks: TaskItem[], date: LocalDate, label: string) => {
      if (!tasks.length) return;
      const now = browserNow();
      const changes = tasks.map((task) => ({ id: task.id, dueDate: date, dueTime: timeAfterMove(task, date, now) }));
      const previous = tasks.map((task) => ({ id: task.id, dueDate: task.dueDate, dueTime: task.dueTime }));
      setOverride(changes.map((item) => [item.id, item]));
      const result = await finisherApi<DueChangesResult>("POST", "/api/finisher/tasks/due-changes", { changes });
      if (!result.ok) {
        setOverride(changes.map((item) => [item.id, null]));
        toast.add({ title: "Couldn’t move the tasks", description: generalErrorMessage(result.error), type: "error" });
        return;
      }
      const moved = new Set(result.data.moved);
      setOverride(changes.filter((item) => !moved.has(item.id)).map((item) => [item.id, null]));
      const failed = changes.length - moved.size;
      toast.add({
        title: `${moved.size} ${moved.size === 1 ? "task" : "tasks"} moved to ${label}`,
        description: failed ? `${failed} couldn’t be moved and stayed where ${failed === 1 ? "it was" : "they were"}.` : undefined,
        type: failed ? "warning" : "success",
        actionProps: moved.size
          ? {
              children: "Undo",
              onClick: () => {
                const back = previous.filter((item) => moved.has(item.id));
                setOverride(back.map((item) => [item.id, item]));
                void finisherApi("POST", "/api/finisher/tasks/due-changes", { changes: back }).then(async (undo) => {
                  if (!undo.ok) toast.add({ title: "Couldn’t undo the move", description: generalErrorMessage(undo.error), type: "error" });
                  await refresh();
                  setOverride(back.map((item) => [item.id, null]));
                });
              },
            }
          : undefined,
      });
      document.getElementById(current ? "carried-title" : "week-range")?.focus();
      await refresh();
      setOverride(changes.map((item) => [item.id, null]));
    },
    [current, refresh, setOverride],
  );

  const api = useMemo<WeekPlanApi>(
    () => ({
      weekStart: data.weekStart,
      today,
      projects: data.projects,
      dragEnabled: !mobile,
      move,
      setTime,
      openMoveDialog: setMoveFor,
      openSetTime: setTimeFor,
    }),
    [data.weekStart, data.projects, today, mobile, move, setTime],
  );

  // Drag a card between columns (laptop only, A27). Pointer only: keyboard
  // users move a task with Move to day… in its ⋯ menu.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const activeTask = activeId ? placed.all.find((task) => task.id === activeId) ?? null : null;
  const activeTitle = activeTask?.title ?? "Task";
  const announcements: Announcements = {
    onDragStart: () => `Picked up “${activeTitle}”.`,
    onDragOver: ({ over }) => (over ? `“${activeTitle}” over ${targetName(over.id)}.` : `“${activeTitle}” is not over a day.`),
    onDragEnd: ({ over }) => (over ? `“${activeTitle}” dropped on ${targetName(over.id)}.` : `“${activeTitle}” dropped. It stays where it was.`),
    onDragCancel: () => `Move cancelled. “${activeTitle}” stays where it was.`,
  };

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const task = placed.all.find((item) => item.id === String(event.active.id));
    const target = event.over ? (String(event.over.id) as PlanTarget) : null;
    if (!task || !target || !canPlanOn(target, task, today)) return;
    void move(task, target === "unplanned" ? null : target, "title");
  }

  const unavailable = (target: PlanTarget) => activeTask !== null && !canPlanOn(target, activeTask, today);
  const nothingPlanned =
    placed.all.length === 0 && data.days.every((day) => day.sessions.length === 0 && day.finished.length === 0);
  const revisitTotal = data.revisitDue ? data.revisitDue.tasks + data.revisitDue.projects : 0;
  const unplannedTotal = data.unplanned.total + placed.unplanned.length - data.unplanned.items.length;
  const carriedTotal = (data.carried?.total ?? 0) + placed.carried.length - (data.carried?.items.length ?? 0);

  return (
    <WeekPlanContext.Provider value={api}>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        accessibility={{ announcements }}
        onDragStart={(event) => setActiveId(String(event.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex flex-col gap-4">
          {revisitTotal > 0 ? (
            <p className="flex flex-wrap items-center gap-x-2 text-sm">
              <FlagIcon aria-hidden="true" className="size-4 text-muted-foreground" />
              {revisitTotal} parked {revisitTotal === 1 ? "item is" : "items are"} due for revisit ·
              <Link
                to={data.revisitDue!.tasks > 0 ? "/finisher/tasks" : "/finisher/projects"}
                hash="parked"
                className="font-medium text-accent-foreground underline underline-offset-4"
              >
                Review parked
              </Link>
            </p>
          ) : null}

          {placed.carried.length ? (
            <CarriedOver
              tasks={placed.carried}
              total={carriedTotal}
              shown={shown.carried}
              onShowMore={() => setShown((value) => ({ ...value, carried: value.carried + PAGE }))}
              onMoveAll={(kind) => {
                const now = browserNow();
                return kind === "today"
                  ? moveAll(placed.carried, now.date, "today")
                  : moveAll(placed.carried, startOfNextWeek(now.date), `next week (${formatWeekdayDate(startOfNextWeek(now.date))})`);
              }}
            />
          ) : null}

          {nothingPlanned ? (
            <EmptyState title="Nothing planned for this week" description="Add a task, or move one here from another week.">
              <AddTaskButton today={today} projects={data.projects} />
            </EmptyState>
          ) : null}

          {/* Phone: one day at a time (FIN-043). */}
          <div role="group" aria-label="Choose a day" className={cn("grid gap-1 lg:hidden", showWeekend ? "grid-cols-7" : "grid-cols-5")}>
            {visibleDays.map((day) => {
              const count = dayToDoCount({ open: placed.days.get(day.date) ?? [], sessions: day.sessions }, today);
              const isToday = day.date === today;
              return (
                <button
                  key={day.date}
                  type="button"
                  aria-pressed={day.date === selectedDay}
                  aria-label={`${formatWeekdayDate(day.date)}${isToday ? ", today" : ""}, ${count} to do`}
                  onClick={() => setPickedDay(day.date)}
                  className={cn(
                    "flex min-h-15 flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent text-xs leading-tight text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isToday && "border-input",
                    day.date < today && "opacity-70",
                    "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:opacity-100",
                  )}
                >
                  <span aria-hidden="true">{isToday ? "Today" : weekdayShort(isoWeekday(day.date))}</span>
                  <span aria-hidden="true" className="text-base font-semibold text-foreground in-aria-pressed:text-primary-foreground">
                    {Number(day.date.slice(8, 10))}
                  </span>
                  <span aria-hidden="true" className="min-h-4 font-mono text-[0.6875rem]">
                    {count || ""}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Laptop: Unplanned and seven days; the board scrolls sideways inside itself if the window is narrow. */}
          <div className="lg:overflow-x-auto lg:overscroll-x-contain lg:pb-2">
            <div
              className={cn(
                "flex flex-col gap-6 lg:grid lg:gap-1.5",
                showWeekend
                  ? unplannedCollapsed
                    ? "lg:grid-cols-[3rem_repeat(7,minmax(7.5rem,1fr))]"
                    : "lg:grid-cols-[13rem_repeat(7,minmax(7.5rem,1fr))]"
                  : unplannedCollapsed
                    ? "lg:grid-cols-[3rem_repeat(5,minmax(9rem,1fr))]"
                    : "lg:grid-cols-[13rem_repeat(5,minmax(9rem,1fr))]",
              )}
            >
              <DropColumn
                id="unplanned"
                label="Remove the day"
                unavailable={unavailable("unplanned")}
                dragging={activeTask !== null}
                className={cn("max-lg:order-last lg:bg-card", unplannedCollapsed && "lg:items-center lg:px-1")}
              >
                <div className="flex items-center justify-between gap-2 px-1 pb-2">
                  <h3
                    id="unplanned-title"
                    tabIndex={-1}
                    className={cn(
                      "flex items-center gap-2 font-heading text-lg font-medium outline-none lg:font-sans lg:text-sm lg:font-semibold",
                      unplannedCollapsed && "lg:sr-only",
                    )}
                  >
                    <InboxIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                    Unplanned
                    <span className="font-mono text-xs font-normal text-muted-foreground">
                      {unplannedTotal}
                      <span className="sr-only"> tasks</span>
                    </span>
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="hidden size-9 lg:inline-flex"
                    aria-expanded={!unplannedCollapsed}
                    aria-label={`${unplannedCollapsed ? "Show" : "Hide"} Unplanned (${unplannedTotal} tasks)`}
                    disabled={Boolean(panel?.selectedId)}
                    onClick={() => setUnplannedOpen(unplannedCollapsed)}
                  >
                    {unplannedCollapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
                  </Button>
                </div>
                {unplannedCollapsed ? (
                  <p aria-hidden="true" className="hidden rotate-180 text-[0.8125rem] font-medium [writing-mode:vertical-rl] lg:block">
                    Unplanned · {unplannedTotal}
                  </p>
                ) : null}
                <div className={cn("flex flex-col gap-2", unplannedCollapsed && "lg:hidden")}>
                  {placed.unplanned.length ? (
                    placed.unplanned.slice(0, shown.unplanned).map((task) => <PlanTaskCard key={task.id} task={task} />)
                  ) : (
                    <p className="px-1 py-2 text-sm text-muted-foreground">Every open task has a day.</p>
                  )}
                  <MoreOf
                    loaded={placed.unplanned.length}
                    shown={shown.unplanned}
                    total={unplannedTotal}
                    onShowMore={() => setShown((value) => ({ ...value, unplanned: value.unplanned + PAGE }))}
                  />
                  <AddToDay date={null} today={today} projects={data.projects} />
                </div>
              </DropColumn>

              {visibleDays.map((day) => {
                const open = placed.days.get(day.date) ?? [];
                const entries = orderDayItems(day.sessions, open);
                const finished = showDone ? day.finished : [];
                const past = day.date < today;
                const count = dayToDoCount({ open, sessions: day.sessions }, today);
                return (
                  <DropColumn
                    key={day.date}
                    id={day.date}
                    label={`Plan for ${formatWeekdayDate(day.date)}`}
                    unavailable={unavailable(day.date)}
                    dragging={activeTask !== null}
                    today={day.date === today}
                    className={cn(day.date !== selectedDay && "max-lg:hidden")}
                  >
                    <header className="flex flex-wrap items-baseline justify-between gap-x-2 px-1 pb-2">
                      <h3 id={`day-${day.date}`} className={cn("font-heading text-lg font-medium lg:font-sans lg:text-sm lg:font-semibold", past && "lg:text-muted-foreground")}>
                        <span className="lg:hidden">{formatWeekdayDate(day.date)}</span>
                        <span className="hidden lg:inline">{formatDayShort(day.date)}</span>
                        {day.date === today ? (
                          <span className="ml-1.5 rounded-full bg-primary px-2 py-0.5 align-middle font-sans text-[0.6875rem] font-semibold text-primary-foreground">
                            Today
                          </span>
                        ) : null}
                      </h3>
                      <span className="font-mono text-xs text-muted-foreground">{count ? `${count} to do` : past ? "Past" : ""}</span>
                    </header>
                    <div className="flex flex-col gap-2">
                      {entries.map((entry) =>
                        entry.kind === "session" ? (
                          <PlanSessionCard key={`${entry.item.slotId}|${entry.item.date}`} session={entry.item} />
                        ) : (
                          <PlanTaskCard key={entry.item.id} task={entry.item} />
                        ),
                      )}
                      {finished.map((task) => (
                        <PlanTaskCard key={task.id} task={task} />
                      ))}
                      {!entries.length && !finished.length ? <p className="px-1 py-2 text-sm text-muted-foreground">Nothing planned</p> : null}
                    </div>
                    {past ? null : <AddToDay date={day.date} today={today} projects={data.projects} />}
                  </DropColumn>
                );
              })}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={reduceMotion ? null : undefined}>
          {activeTask ? (
            <div aria-hidden="true" className="flex cursor-grabbing items-start gap-2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-[0_12px_32px_rgb(0_0_0/0.18)]">
              <GripVerticalIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium break-words">{activeTask.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {moveFor ? (
        <MoveToDayDialog
          key={moveFor.id}
          task={moveFor}
          weekStart={data.weekStart}
          onOpenChange={(open) => !open && setMoveFor(null)}
          onChoose={(date) => {
            const task = moveFor;
            setMoveFor(null);
            void move(task, date, "more");
          }}
        />
      ) : null}
      {timeFor ? (
        <SetTimeDialog
          key={timeFor.id}
          task={timeFor}
          onOpenChange={(open) => !open && setTimeFor(null)}
          onChoose={(time) => {
            const task = timeFor;
            setTimeFor(null);
            void setTime(task, time);
          }}
        />
      ) : null}
    </WeekPlanContext.Provider>
  );
}

/** A board column that takes dropped tasks; unavailable ones are hatched while dragging (FIN-044). */
function DropColumn({
  id,
  label,
  unavailable,
  dragging,
  today = false,
  className,
  children,
}: {
  id: PlanTarget;
  label: string;
  unavailable: boolean;
  dragging: boolean;
  today?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: unavailable });
  const headingId = id === "unplanned" ? "unplanned-title" : `day-${id}`;
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col lg:min-h-88 lg:rounded-xl lg:border lg:bg-muted lg:px-1 lg:py-2 lg:transition-colors lg:duration-150",
        today && "lg:border-ring lg:bg-accent",
        dragging && unavailable && "opacity-50 lg:bg-[repeating-linear-gradient(135deg,transparent_0_8px,var(--border)_8px_9px)]",
        isOver && !unavailable && "lg:bg-popover lg:shadow-[inset_0_0_0_2px_var(--ring)]",
        className,
      )}
    >
      {isOver && !unavailable ? (
        <p aria-hidden="true" className="mb-2 hidden rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground lg:block">
          {label}
        </p>
      ) : null}
      {children}
    </section>
  );
}

/** "Show more" over the loaded tasks, and a pointer to the Tasks tab beyond them (TD-FIN-1). */
function MoreOf({ loaded, shown, total, onShowMore }: { loaded: number; shown: number; total: number; onShowMore: () => void }) {
  return (
    <>
      {loaded > shown ? (
        <Button variant="ghost" className="h-11 justify-start lg:h-9" onClick={onShowMore}>
          Show more ({loaded - shown})
        </Button>
      ) : null}
      {total > loaded && shown >= loaded ? (
        <p className="px-1 text-xs text-muted-foreground">
          Showing {loaded} of {total}.{" "}
          <Link to="/finisher/tasks" className="underline underline-offset-4">
            See all in Tasks
          </Link>
        </p>
      ) : null}
    </>
  );
}

/** Add on a day presets its date; Add in Unplanned has none (FIN-043). Past days have no Add (A25). */
function AddToDay({ date, today, projects }: { date: LocalDate | null; today: LocalDate; projects: WeekData["projects"] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        className="mt-1 h-11 w-full justify-start gap-2 px-2 text-muted-foreground lg:h-9"
        aria-label={date ? `Add a task on ${formatWeekdayDate(date)}` : "Add a task with no day"}
        onClick={() => setOpen(true)}
      >
        <PlusIcon data-icon="inline-start" />
        {date ? "Add" : "Add unplanned task"}
      </Button>
      <TaskFormDialog open={open} onOpenChange={setOpen} today={today} projects={projects} defaultDueDate={date ?? undefined} />
    </>
  );
}

/** FIN-046: open tasks due before today, with quick moves and "Move all". Nothing moves on its own. */
function CarriedOver({
  tasks,
  total,
  shown,
  onShowMore,
  onMoveAll,
}: {
  tasks: TaskItem[];
  total: number;
  shown: number;
  onShowMore: () => void;
  onMoveAll: (kind: "today" | "nextWeek") => Promise<void>;
}) {
  const plan = useWeekPlan();
  return (
    <section aria-labelledby="carried-title" className="rounded-2xl border border-destructive/40 bg-card p-4 text-card-foreground sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="carried-title" tabIndex={-1} className="font-heading text-lg font-medium outline-none">
            {total} {total === 1 ? "task" : "tasks"} carried over
          </h3>
          <p className="text-sm text-muted-foreground">Due earlier and still open. Give each a new day, or let it go.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 px-3" onClick={() => void onMoveAll("today")}>
            Move all to today
          </Button>
          <Button variant="outline" className="h-11 px-3" onClick={() => void onMoveAll("nextWeek")}>
            Move all to next week
          </Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {tasks.slice(0, shown).map((task) => (
          <PlanTaskCard
            key={task.id}
            task={task}
            carried
            actions={
              <>
                <Button
                  variant="ghost"
                  className="h-11 px-3 text-accent-foreground lg:h-8"
                  aria-label={`Move “${task.title}” to today`}
                  onClick={() => void plan.move(task, browserNow().date, "title")}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 px-3 text-accent-foreground lg:h-8"
                  aria-label={`Move “${task.title}” to next week, ${formatDate(startOfNextWeek(browserNow().date))}`}
                  onClick={() => void plan.move(task, startOfNextWeek(browserNow().date), "title")}
                >
                  Next week
                </Button>
              </>
            }
          />
        ))}
      </div>
      <div className="mt-2">
        <MoreOf loaded={tasks.length} shown={shown} total={total} onShowMore={onShowMore} />
      </div>
    </section>
  );
}
