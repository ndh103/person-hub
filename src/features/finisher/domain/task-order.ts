/**
 * The user's task order (FIN-038, ADR-0005), from the browser's side: a move
 * is sent as the ids shown directly before and after the task in its section.
 * The server works out the stored key; the browser only reorders ids.
 */
export type MoveTarget = "top" | "up" | "down" | "bottom";

/** The section's ids after moving `id` to `index`, or null when nothing changes. */
export function moveToIndex<T extends string>(ids: readonly T[], id: T, index: number): T[] | null {
  const from = ids.indexOf(id);
  if (from === -1) return null;
  const to = Math.max(0, Math.min(index, ids.length - 1));
  if (to === from) return null;
  const next = ids.filter((other) => other !== id);
  next.splice(to, 0, id);
  return next;
}

/** Move up / down / to top / to bottom (the menu alternative to dragging). */
export function moveBy<T extends string>(ids: readonly T[], id: T, target: MoveTarget): T[] | null {
  const from = ids.indexOf(id);
  if (from === -1) return null;
  const index = target === "top" ? 0 : target === "bottom" ? ids.length - 1 : target === "up" ? from - 1 : from + 1;
  if (index < 0 || index >= ids.length) return null;
  return moveToIndex(ids, id, index);
}

/** Which Move items make sense for the task at `index` of `count`. */
export function availableMoves(index: number, count: number): MoveTarget[] {
  if (count < 2 || index < 0) return [];
  const moves: MoveTarget[] = [];
  if (index > 0) moves.push("top", "up");
  if (index < count - 1) moves.push("down", "bottom");
  return moves;
}

/** The request body for PUT /api/finisher/tasks/:id/position. */
export function neighbours<T extends string>(ids: readonly T[], id: T): { afterId: T | null; beforeId: T | null } {
  const index = ids.indexOf(id);
  return { afterId: index > 0 ? ids[index - 1] : null, beforeId: index >= 0 && index < ids.length - 1 ? ids[index + 1] : null };
}
