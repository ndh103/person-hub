import { EventsView } from "@/features/events/components/events-view";
import type { EventsFilter } from "@/features/events/api";

/** Events (EVT-001). The router keeps `q` and `year` in the page URL (EVT-009). */
export function EventsPage({
  filter,
  onFilterChange,
}: {
  filter: EventsFilter;
  onFilterChange: (next: EventsFilter, options?: { replace?: boolean }) => void;
}) {
  return <EventsView filter={filter} onFilterChange={onFilterChange} />;
}
