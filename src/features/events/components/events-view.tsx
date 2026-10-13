import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarIcon, CircleAlertIcon, PlusIcon, RefreshCwIcon, SearchIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { browserToday, formatDate } from "@/lib/dates";
import { eventsKeys, eventsQueries, type EventsFilter } from "../api";
import { cleanQuery, LIMITS } from "../domain/validation";
import type { EventItem } from "../types";
import { DeleteEventDialog } from "./delete-event-dialog";
import { EventFormDialog } from "./event-form-dialog";
import { EventRow } from "./event-row";

const SEARCH_DELAY_MS = 250;

type Group = { key: string; heading: string; description?: string; items: EventItem[] };

/** Year headings without search; "Exact matches" then "Also matching without accents" with search (EVT-009). */
function groupEvents(items: EventItem[], searching: boolean, q: string): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    const key = searching ? (item.match ?? "exact") : item.date.slice(0, 4);
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      group =
        key === "accent"
          ? {
              key,
              heading: "Also matching without accents",
              description: `Ignoring Vietnamese accent marks, so “${q}” also finds these.`,
              items: [],
            }
          : { key, heading: key === "exact" ? "Exact matches" : key, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/**
 * Focuses a row trigger once it is rendered (after a refetch commits), trying
 * for a few frames; gives up quietly if the row never appears.
 */
function focusRowSoon(find: (triggers: HTMLElement[]) => HTMLElement | undefined, frames = 30) {
  requestAnimationFrame(() => {
    const target = find([...document.querySelectorAll<HTMLElement>("[data-event-trigger]")]);
    if (target) {
      target.scrollIntoView({ block: "nearest" });
      target.focus();
    } else if (frames > 0) focusRowSoon(find, frames - 1);
  });
}

const byId = (id: string) => (triggers: HTMLElement[]) => triggers.find((element) => element.dataset.eventTrigger === id);

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * The Events page (EVT-001 to EVT-009): search and year filter, the list in
 * date order with "Load more", and the add, edit and delete dialogs. The
 * search text and year live in the page URL (EVT-009); `onFilterChange`
 * updates it.
 */
export function EventsView({
  filter,
  onFilterChange,
}: {
  filter: EventsFilter;
  onFilterChange: (next: EventsFilter, options?: { replace?: boolean }) => void;
}) {
  const queryClient = useQueryClient();
  const searchId = useId();
  const yearId = useId();
  const q = filter.q ? cleanQuery(filter.q) : "";
  const searching = q !== "";
  const filtered = searching || filter.year !== undefined;

  const list = useInfiniteQuery({ ...eventsQueries.list({ q, year: filter.year }), placeholderData: keepPreviousData });
  const years = useQuery(eventsQueries.years());

  // The search box updates the URL after a short pause, not on every key.
  // `lastSent` is the cleaned text last written to the URL, so the box keeps
  // what the user is typing (such as a trailing space) while the URL holds
  // the cleaned search.
  const [text, setText] = useState(filter.q ?? "");
  const lastSent = useRef(q);
  useEffect(() => {
    // Back/forward changed the URL: show its value.
    if (q !== lastSent.current) {
      lastSent.current = q;
      setText(q);
    }
  }, [q]);
  useEffect(() => {
    const next = cleanQuery(text);
    if (next === lastSent.current) return;
    const timer = setTimeout(() => {
      lastSent.current = next;
      onFilterChange({ q: next || undefined, year: filter.year }, { replace: true });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, filter.year, onFilterChange]);

  function clearFilters() {
    lastSent.current = "";
    setText("");
    onFilterChange({});
    document.getElementById(searchId)?.focus();
  }

  // Dialogs and row state.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());

  const pages = list.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const counts = pages[0]?.counts;
  const today = browserToday();

  function setRowOpen(id: string, open: boolean) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function openForm(event?: EventItem) {
    setEditing(event);
    setFormOpen(true);
  }

  async function onSaved(item: EventItem) {
    const verb = editing ? "Event updated" : "Event added";
    await queryClient.invalidateQueries({ queryKey: eventsKeys.all });
    const loaded = queryClient.getQueryData(eventsQueries.list({ q, year: filter.year }).queryKey);
    const present = loaded?.pages.some((page) => page.items.some((event) => event.id === item.id));
    if (present) {
      setRowOpen(item.id, true);
      focusRowSoon(byId(item.id));
      toast.add({ title: verb, type: "success" });
    } else if (filtered) {
      toast.add({
        title: verb,
        description: "It is hidden by the current search or filter.",
        type: "success",
        actionProps: { children: "Clear filters", onClick: clearFilters },
      });
    } else {
      toast.add({ title: verb, type: "success" });
    }
  }

  async function onDeleted(event: EventItem) {
    const index = items.findIndex((item) => item.id === event.id);
    const neighbour = items[index + 1] ?? items[index - 1];
    setRowOpen(event.id, false);
    await queryClient.invalidateQueries({ queryKey: eventsKeys.all });
    toast.add({ title: "Event deleted", type: "success" });
    if (neighbour) focusRowSoon(byId(neighbour.id));
    else document.getElementById("events-title")?.focus();
  }

  // Keyboard users continue at the first newly loaded event.
  async function loadMore() {
    const firstNew = items.length;
    const result = await list.fetchNextPage();
    if (result.isSuccess) focusRowSoon((triggers) => triggers[firstNew]);
  }

  const yearOptions = [...(years.data ?? [])];
  if (filter.year !== undefined && !yearOptions.includes(filter.year)) yearOptions.push(filter.year);
  yearOptions.sort((a, b) => b - a);

  let summary = "";
  if (list.isPending) summary = "Loading events…";
  else if (counts && items.length) {
    const total = counts.exact + counts.accent;
    summary = searching
      ? `${plural(total, "event", "events")} found${counts.accent ? ` · ${counts.exact} exact, ${counts.accent} more without accents` : ""}`
      : `${plural(total, "event", "events")}${filter.year ? ` in ${filter.year}` : ""}`;
  } else if (list.isSuccess && !items.length && filtered) summary = "0 events found";

  return (
    <section aria-labelledby="events-title" className="flex flex-col gap-6">
      {/* Same header as Finisher: title, then the mono "Today · 13 Oct 2026" line. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 id="events-title" tabIndex={-1} className="font-heading text-3xl font-medium outline-none lg:text-4xl">
            Events
          </h1>
          <p className="font-mono text-[0.8125rem] text-muted-foreground">
            Today · <time dateTime={today}>{formatDate(today)}</time>
          </p>
        </div>
        <Button className="h-11" onClick={() => openForm()}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Add event
        </Button>
      </div>

      {/* EVT-009: search and year. Stacked on phones, one row from 640px. */}
      <form role="search" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={searchId}>Search events</Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id={searchId}
              type="search"
              className="h-11 pr-11 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
              placeholder="Title or notes"
              value={text}
              maxLength={LIMITS.query}
              autoComplete="off"
              enterKeyHint="search"
              aria-describedby={`${searchId}-hint`}
              onChange={(e) => setText(e.target.value)}
            />
            {text ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 size-11 text-muted-foreground"
                aria-label="Clear search"
                onClick={() => {
                  lastSent.current = "";
                  setText("");
                  onFilterChange({ year: filter.year });
                  document.getElementById(searchId)?.focus();
                }}
              >
                <XIcon />
              </Button>
            ) : null}
          </div>
          <p id={`${searchId}-hint`} className="sr-only">
            Results update as you type. Exact matches come first, then matches that ignore Vietnamese accent marks.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={yearId}>Year</Label>
          <NativeSelect
            id={yearId}
            className="w-full [&_select]:h-11"
            value={filter.year ? String(filter.year) : ""}
            onChange={(e) => {
              // Include text typed in the last moment, before its pause elapsed.
              lastSent.current = cleanQuery(text);
              onFilterChange({ q: lastSent.current || undefined, year: e.target.value ? Number(e.target.value) : undefined });
            }}
          >
            <NativeSelectOption value="">All years</NativeSelectOption>
            {yearOptions.map((year) => (
              <NativeSelectOption key={year} value={String(year)}>
                {year}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </form>

      <div className="-mt-2 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="flex items-center gap-2 font-mono text-[0.8125rem] text-muted-foreground">
          {summary}
          {list.isFetching && !list.isPending && !list.isFetchingNextPage ? <Spinner aria-hidden="true" /> : null}
        </p>
        {filtered && items.length ? (
          <Button variant="link" className="h-8 px-2" onClick={clearFilters}>
            Clear search and filters
          </Button>
        ) : null}
      </div>

      {list.isPending ? (
        <ul aria-hidden="true" className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {[0, 1, 2, 3].map((n) => (
            <li key={n} className="p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-28" />
            </li>
          ))}
        </ul>
      ) : list.isError && !items.length ? (
        <Alert variant="destructive" role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CircleAlertIcon />
          <div className="flex-1">
            <AlertTitle>Couldn’t load your events</AlertTitle>
            <AlertDescription>Check your connection and try again.{searching ? " Your search is kept." : ""}</AlertDescription>
          </div>
          <Button variant="outline" className="h-11 self-start sm:self-auto" onClick={() => void list.refetch()}>
            <RefreshCwIcon data-icon="inline-start" />
            Try again
          </Button>
        </Alert>
      ) : !items.length && !filtered ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarIcon />
            </EmptyMedia>
            <EmptyTitle className="font-heading text-xl font-medium">No events yet</EmptyTitle>
            <EmptyDescription>Record something that happened, like buying a new TV, or something you have planned.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="h-11" onClick={() => openForm()}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Add event
            </Button>
          </EmptyContent>
        </Empty>
      ) : !items.length ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyTitle className="[overflow-wrap:anywhere]">
              No events match{searching ? ` “${q}”` : ""}
              {filter.year ? ` in ${filter.year}` : ""}.
            </EmptyTitle>
            <EmptyDescription>Search looks in titles and notes.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" className="h-11" onClick={clearFilters}>
              Clear search and filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {groupEvents(items, searching, q).map((group) => (
            <section key={group.key} aria-labelledby={`events-group-${group.key}`}>
              <h2 id={`events-group-${group.key}`} className="mb-3 font-heading text-xl font-medium">
                {group.heading}
              </h2>
              {group.description ? <p className="-mt-2 mb-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">{group.description}</p> : null}
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
                {group.items.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    today={today}
                    open={openIds.has(event.id)}
                    onOpenChange={(open) => setRowOpen(event.id, open)}
                    onEdit={() => openForm(event)}
                    onDelete={() => setDeleting(event)}
                  />
                ))}
              </ul>
            </section>
          ))}
          {list.isFetchNextPageError ? (
            <Alert variant="destructive" role="alert">
              <CircleAlertIcon />
              <AlertTitle>Couldn’t load more events</AlertTitle>
              <AlertDescription>Check your connection and try again.</AlertDescription>
            </Alert>
          ) : null}
          {list.hasNextPage ? (
            <div className="flex justify-center">
              <Button variant="outline" className="h-11" disabled={list.isFetchingNextPage} onClick={() => void loadMore()}>
                {list.isFetchingNextPage ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} onSaved={(item) => void onSaved(item)} />
      <DeleteEventDialog event={deleting} onOpenChange={(open) => !open && setDeleting(null)} onDeleted={(event) => void onDeleted(event)} />
    </section>
  );
}
