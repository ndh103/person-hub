import { createContext, useContext } from "react";
import type { LocalDate, LocalTime } from "../../domain/dates";
import type { ProjectOption, TaskItem } from "../../types";

/** Where focus goes after a task moved: its drag handle, its ⋯ button, or its title (FIN-044). */
export type FocusTarget = "handle" | "more" | "title";

/**
 * What the week board offers its cards, menus and dialogs. Moves are
 * optimistic: the board shows the new day at once and puts it back if saving
 * fails (FIN-044, FIN-048).
 */
export type WeekPlanApi = {
  weekStart: LocalDate;
  /** The server's today for this board. */
  today: LocalDate;
  projects: ProjectOption[];
  /** Laptop: cards can be dragged between days (A27). */
  dragEnabled: boolean;
  move: (task: TaskItem, date: LocalDate | null, focus: FocusTarget) => Promise<void>;
  setTime: (task: TaskItem, time: LocalTime | null) => Promise<void>;
  openMoveDialog: (task: TaskItem) => void;
  openSetTime: (task: TaskItem) => void;
};

export const WeekPlanContext = createContext<WeekPlanApi | null>(null);

export function useWeekPlan(): WeekPlanApi {
  const api = useContext(WeekPlanContext);
  if (!api) throw new Error("useWeekPlan outside the week board");
  return api;
}

/** Puts focus back on a task after the board re-rendered it (maybe in another column), or on the week heading. */
export function focusWeekTask(id: string, target: FocusTarget): void {
  requestAnimationFrame(() => {
    const card = document.querySelector<HTMLElement>(`[data-week-task="${id}"]`);
    const element = card?.querySelector<HTMLElement>(`[data-focus="${target}"]`) ?? card?.querySelector<HTMLElement>('[data-focus="title"]');
    if (element && element.offsetParent !== null) element.focus();
    else document.getElementById("week-range")?.focus();
  });
}
