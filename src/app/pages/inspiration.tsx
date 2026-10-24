import { InspirationView } from "@/features/inspiration/components/inspiration-view";
import { ItemView } from "@/features/inspiration/components/item-view";
import type { InspirationFilter } from "@/features/inspiration/types";

/** Inspiration (INS-001). The router keeps `q`, `kind` and `tag` in the page URL (INS-008). */
export function InspirationPage({
  filter,
  onFilterChange,
}: {
  filter: InspirationFilter;
  onFilterChange: (next: InspirationFilter, options?: { replace?: boolean }) => void;
}) {
  return <InspirationView filter={filter} onFilterChange={onFilterChange} />;
}

/** One entry at /inspiration/<id> (INS-005). */
export function InspirationEntryPage({ id, onTag, onDeleted }: { id: string; onTag: (tag: string) => void; onDeleted: () => void }) {
  return <ItemView id={id} onTag={onTag} onDeleted={onDeleted} />;
}
