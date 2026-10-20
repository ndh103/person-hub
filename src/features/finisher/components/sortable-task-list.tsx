import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { finisherApi } from "../api";
import type { LocalDate } from "../domain/dates";
import { availableMoves, moveBy, moveToIndex, neighbours, type MoveTarget } from "../domain/task-order";
import { generalErrorMessage } from "../messages";
import type { ProjectOption, TaskItem } from "../types";
import { RowList } from "./list-parts";
import { TaskDue, TaskRow } from "./task-row";
import { useFinisherRefresh } from "./use-refresh";

/**
 * FIN-038: a section of open tasks the user can reorder: by dragging the
 * handle (mouse, pen or touch), with the keyboard on the handle (Space,
 * arrows, Space; Escape cancels), or with Move items in the row menu. Each
 * section is its own DndContext, so a task can't leave its section (decision
 * 19); releasing outside the section cancels. The new order shows at once and
 * is saved as the shown neighbours (ADR-0005); a failed save puts this section
 * back and refetches the server's order.
 *
 * Controlled: the parent owns `items` (it also appends "Load more" pages).
 */
export function SortableTaskList({
  section,
  items,
  onItemsChange,
  today,
  projects,
  showProject,
}: {
  /** Section name used in announcements and as the list label, e.g. "Due today". */
  section: string;
  items: TaskItem[];
  onItemsChange: (items: TaskItem[]) => void;
  today: LocalDate;
  projects: ProjectOption[];
  showProject?: boolean;
}) {
  const refresh = useFinisherRefresh();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const ids = items.map((task) => task.id);
  const draggable = items.length > 1;

  const sensors = useSensors(
    // Only the handle has listeners; a 4px move starts a drag, so a tap on the handle doesn't.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const title = (id: UniqueIdentifier) => items.find((task) => task.id === id)?.title ?? "Task";
  const position = (id: UniqueIdentifier) => `position ${ids.indexOf(String(id)) + 1} of ${ids.length} in ${section}`;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up “${title(active.id)}”. ${capitalise(position(active.id))}.`,
    onDragOver: ({ active, over }) => (over ? `“${title(active.id)}” moved to ${position(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `“${title(active.id)}” dropped at ${position(over.id)}.` : `“${title(active.id)}” dropped. The order did not change.`,
    onDragCancel: ({ active }) => `Move cancelled. “${title(active.id)}” is back in its place.`,
  };

  async function commit(nextIds: string[], movedId: string) {
    const previous = items;
    const byId = new Map(items.map((task) => [task.id, task]));
    onItemsChange(nextIds.map((id) => byId.get(id)!));
    const result = await finisherApi("PUT", `/api/finisher/tasks/${movedId}/position`, neighbours(nextIds, movedId));
    if (!result.ok) {
      // Only this section goes back; then the server's order is fetched (it may have changed elsewhere).
      onItemsChange(previous);
      toast.add({ title: "Couldn’t save the new order. It’s back as it was.", description: generalErrorMessage(result.error), type: "error" });
    }
    void refresh();
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    // Released outside the section (with a little tolerance): cancel.
    const box = listRef.current?.getBoundingClientRect();
    const dropped = active.rect.current.translated;
    if (box && dropped) {
      const middle = dropped.top + dropped.height / 2;
      if (middle < box.top - 24 || middle > box.bottom + 24) return;
    }
    const next = moveToIndex(ids, String(active.id), ids.indexOf(String(over.id)));
    if (next) void commit(next, String(active.id));
  }

  function onMove(id: string, target: MoveTarget) {
    const next = moveBy(ids, id, target);
    if (next) void commit(next, id);
  }

  const activeTask = activeId ? items.find((task) => task.id === activeId) : undefined;

  return (
    <div ref={listRef}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To reorder, press Space or Enter to pick up the task. Use the up and down arrow keys to move it within the section. Press Space or Enter to drop, or Escape to cancel.",
          },
        }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <RowList label={section}>
            {items.map((task, index) =>
              draggable ? (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  projects={projects}
                  showProject={showProject}
                  reduceMotion={reduceMotion}
                  reorder={{ moves: availableMoves(index, items.length), onMove: (target) => onMove(task.id, target) }}
                />
              ) : (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  projects={projects}
                  showProject={showProject}
                  handle={<span aria-hidden="true" className="w-7 shrink-0" />}
                />
              ),
            )}
          </RowList>
        </SortableContext>
        <DragOverlay dropAnimation={reduceMotion ? null : undefined}>
          {activeTask ? <TaskRowGhost task={activeTask} today={today} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Drags move along the list only. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

function SortableTaskRow({
  task,
  today,
  projects,
  showProject,
  reduceMotion,
  reorder,
}: {
  task: TaskItem;
  today: LocalDate;
  projects: ProjectOption[];
  showProject?: boolean;
  reduceMotion: boolean;
  reorder: React.ComponentProps<typeof TaskRow>["reorder"];
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <TaskRow
      task={task}
      today={today}
      projects={projects}
      showProject={showProject}
      reorder={reorder}
      rowRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition: reduceMotion ? undefined : transition }}
      // The row left behind while dragging marks where the task will land.
      className={cn(isDragging && "relative z-10 bg-muted *:opacity-35")}
      handle={
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder “${task.title}”`}
          className="grid h-11 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent aria-pressed:text-accent-foreground active:cursor-grabbing"
        >
          <GripVerticalIcon aria-hidden="true" className="size-4" />
        </button>
      }
    />
  );
}

/** The copy that follows the pointer (not interactive, hidden from assistive tech). */
function TaskRowGhost({ task, today }: { task: TaskItem; today: LocalDate }) {
  return (
    <div
      aria-hidden="true"
      className="flex cursor-grabbing items-center gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-[0_12px_32px_rgb(0_0_0/0.18)] sm:p-4"
    >
      <GripVerticalIcon className="size-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">{task.title}</p>
        <p className="font-mono text-[0.8125rem] text-muted-foreground">
          <TaskDue task={task} today={today} />
        </p>
      </div>
    </div>
  );
}
