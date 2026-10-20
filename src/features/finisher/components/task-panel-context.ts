import { createContext, useContext } from "react";

/**
 * The laptop task side panel (FIN-036), as seen from a task list. Lists that
 * render inside TaskPanelLayout get this; elsewhere (no layout) it is null and
 * task titles keep linking to the task page.
 */
export type TaskPanelApi = {
  /** Laptop width (≥ 1024px): a plain click on a task title opens the panel. */
  enabled: boolean;
  /** The task shown in the panel, or null. */
  selectedId: string | null;
  open: (id: string) => void;
  close: () => void;
};

export const TaskPanelContext = createContext<TaskPanelApi | null>(null);

export function useTaskPanel(): TaskPanelApi | null {
  return useContext(TaskPanelContext);
}

/** True for a plain primary click; modifier and middle clicks keep the link's own behaviour (a new tab). */
export function isPlainClick(event: React.MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
