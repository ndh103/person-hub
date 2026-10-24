import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { CircleAlertIcon, FileTextIcon, RefreshCwIcon, SearchIcon, SparklesIcon, UploadIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/ui/toast";
import { inspirationKeys, inspirationQueries } from "../api";
import { formatBytes, USAGE_WARNING_BYTES } from "../domain/image";
import { cleanQuery, LIMITS, type ItemKind } from "../domain/validation";
import type { InspirationFilter, InspirationListItem } from "../types";
import { ItemCard } from "./item-card";
import { ItemFormDialog } from "./item-form-dialog";
import { UploadDialog } from "./upload-dialog";

const SEARCH_DELAY_MS = 250;

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Focuses a card once it is rendered (after a refetch commits); gives up quietly. */
function focusCardSoon(find: (links: HTMLElement[]) => HTMLElement | undefined, frames = 30) {
  requestAnimationFrame(() => {
    const target = find([...document.querySelectorAll<HTMLElement>("[data-item-link]")]);
    if (target) {
      target.scrollIntoView({ block: "nearest" });
      target.focus();
    } else if (frames > 0) focusCardSoon(find, frames - 1);
  });
}

/** INS-009: the usage line under the title, and the advisory warning. */
function Usage() {
  const usage = useQuery(inspirationQueries.usage());
  if (!usage.isSuccess) return <p className="min-h-5 font-mono text-[0.8125rem] text-muted-foreground" />;
  return (
    <p className="font-mono text-[0.8125rem] text-muted-foreground">
      Images: {formatBytes(usage.data)} used
    </p>
  );
}

function UsageWarning() {
  const usage = useQuery(inspirationQueries.usage());
  if (!usage.isSuccess || usage.data < USAGE_WARNING_BYTES) return null;
  return (
    <Alert role="note">
      <CircleAlertIcon />
      <AlertTitle>Your images use {formatBytes(usage.data)}.</AlertTitle>
      <AlertDescription>
        The free storage plan holds about 1 GB for the whole hub. Delete images you no longer need to keep room for new ones.
      </AlertDescription>
    </Alert>
  );
}

/**
 * The Inspiration page (INS-001, INS-002, INS-008, INS-009): filters, the
 * grid with "Load more", and the add dialogs. The search text, kind and tag
 * live in the page URL; `onFilterChange` updates it.
 */
export function InspirationView({
  filter,
  onFilterChange,
}: {
  filter: InspirationFilter;
  onFilterChange: (next: InspirationFilter, options?: { replace?: boolean }) => void;
}) {
  const queryClient = useQueryClient();
  const searchId = useId();
  const tagId = useId();
  const q = filter.q ? cleanQuery(filter.q) : "";
  const filtered = q !== "" || filter.kind !== undefined || filter.tag !== undefined;

  const list = useInfiniteQuery({ ...inspirationQueries.list({ q, kind: filter.kind, tag: filter.tag }), placeholderData: keepPreviousData });
  const tags = useQuery(inspirationQueries.tags());

  // Same debounce as Events: the box keeps what is typed, the URL the cleaned search.
  const [text, setText] = useState(filter.q ?? "");
  const lastSent = useRef(q);
  useEffect(() => {
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
      onFilterChange({ ...filter, q: next || undefined }, { replace: true });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, filter, onFilterChange]);

  function current(): InspirationFilter {
    // Include text typed in the last moment, before its pause elapsed.
    lastSent.current = cleanQuery(text);
    return { ...filter, q: lastSent.current || undefined };
  }

  function clearFilters() {
    lastSent.current = "";
    setText("");
    onFilterChange({});
    document.getElementById(searchId)?.focus();
  }

  const [articleOpen, setArticleOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const pages = list.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const count = pages[0]?.count;

  async function onSaved(saved: InspirationListItem[], message: string) {
    await queryClient.invalidateQueries({ queryKey: inspirationKeys.all });
    const loaded = queryClient.getQueryData(inspirationQueries.list({ q, kind: filter.kind, tag: filter.tag }).queryKey);
    const shown = saved.some((item) => loaded?.pages.some((page) => page.items.some((entry) => entry.id === item.id)));
    if (shown) {
      focusCardSoon((links) => links.find((element) => element.dataset.itemLink === saved[0].id));
      toast.add({ title: message, type: "success" });
    } else if (filtered) {
      toast.add({
        title: message,
        description: "It is hidden by the current search or filter.",
        type: "success",
        actionProps: { children: "Clear filters", onClick: clearFilters },
      });
    } else toast.add({ title: message, type: "success" });
  }

  async function loadMore() {
    const firstNew = items.length;
    const result = await list.fetchNextPage();
    if (result.isSuccess) focusCardSoon((links) => links[firstNew]);
  }

  const tagOptions = [...(tags.data ?? [])];
  if (filter.tag && !tagOptions.some((option) => option.tag === filter.tag)) tagOptions.push({ tag: filter.tag, count: 0 });
  const tagItems: { value: string | null; label: string }[] = [
    { value: null, label: "All tags" },
    ...tagOptions.map((option) => ({ value: option.tag, label: option.count ? `${option.tag} (${option.count})` : option.tag })),
  ];

  let summary = "";
  if (list.isPending) summary = "Loading…";
  else if (count !== undefined && items.length) summary = filtered ? `${plural(count, "entry", "entries")} found` : plural(count, "entry", "entries");
  else if (list.isSuccess && !items.length && filtered) summary = "0 entries found";

  const what = filter.kind === "article" ? "articles" : filter.kind === "image" ? "images" : "entries";

  return (
    <section aria-labelledby="inspiration-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 id="inspiration-title" tabIndex={-1} className="font-heading text-3xl font-medium outline-none lg:text-4xl">
            Inspiration
          </h1>
          <Usage />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11" onClick={() => setArticleOpen(true)}>
            <FileTextIcon data-icon="inline-start" aria-hidden="true" />
            Add article
          </Button>
          <Button className="h-11" onClick={() => setUploadOpen(true)}>
            <UploadIcon data-icon="inline-start" aria-hidden="true" />
            Add images
          </Button>
        </div>
      </div>

      <UsageWarning />

      {/* INS-008: search, kind and tag. Stacked on phones, one row from 640px. */}
      <form role="search" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_11rem]" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={searchId}>Search inspiration</Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id={searchId}
              type="search"
              className="h-11 pr-11 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
              placeholder="Title, notes, text or tags"
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
                  onFilterChange({ ...filter, q: undefined });
                  document.getElementById(searchId)?.focus();
                }}
              >
                <XIcon />
              </Button>
            ) : null}
          </div>
          <p id={`${searchId}-hint`} className="sr-only">
            Results update as you type. Matching ignores case and Vietnamese accent marks.
          </p>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm leading-none font-medium">Show</legend>
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[filter.kind ?? "all"]}
            onValueChange={(next) => {
              const value = (next as string[])[0];
              if (!value) return; // keep one option pressed
              onFilterChange({ ...current(), kind: value === "all" ? undefined : (value as ItemKind) });
            }}
          >
            <ToggleGroupItem value="all" className="h-11 px-3">All</ToggleGroupItem>
            <ToggleGroupItem value="article" className="h-11 px-3">Articles</ToggleGroupItem>
            <ToggleGroupItem value="image" className="h-11 px-3">Images</ToggleGroupItem>
          </ToggleGroup>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={tagId}>Tag</Label>
          <Select items={tagItems} value={filter.tag ?? null} onValueChange={(tag) => onFilterChange({ ...current(), tag: tag ?? undefined })}>
            <SelectTrigger id={tagId} className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tagItems.map((item) => (
                <SelectItem key={item.value ?? "all"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <ul aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((n) => (
            <li key={n} className="overflow-hidden rounded-2xl border border-border bg-card">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="p-3">
                <Skeleton className="h-3 w-2/3" />
              </div>
            </li>
          ))}
        </ul>
      ) : list.isError && !items.length ? (
        <Alert variant="destructive" role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CircleAlertIcon />
          <div className="flex-1">
            <AlertTitle>Couldn’t load your inspiration</AlertTitle>
            <AlertDescription>Check your connection and try again.</AlertDescription>
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
              <SparklesIcon />
            </EmptyMedia>
            <EmptyTitle className="font-heading text-xl font-medium">Nothing saved yet</EmptyTitle>
            <EmptyDescription>Keep an article or an image that inspired you.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row flex-wrap justify-center">
            <Button variant="outline" className="h-11" onClick={() => setArticleOpen(true)}>
              Add article
            </Button>
            <Button className="h-11" onClick={() => setUploadOpen(true)}>
              Add images
            </Button>
          </EmptyContent>
        </Empty>
      ) : !items.length ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyTitle className="[overflow-wrap:anywhere]">
              No {what} match{q ? ` “${q}”` : ""}
              {filter.tag ? ` tagged ${filter.tag}` : ""}.
            </EmptyTitle>
            <EmptyDescription>Search looks in titles, notes, article text and tags.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" className="h-11" onClick={clearFilters}>
              Clear search and filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          <ul className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <li key={item.id} className="min-w-0">
                <ItemCard item={item} />
              </li>
            ))}
          </ul>
          {list.isFetchNextPageError ? (
            <Alert variant="destructive" role="alert">
              <CircleAlertIcon />
              <AlertTitle>Couldn’t load more</AlertTitle>
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

      <ItemFormDialog open={articleOpen} onOpenChange={setArticleOpen} kind="article" onSaved={(item) => void onSaved([item], "Article saved")} />
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSaved={(saved) => void onSaved(saved, saved.length === 1 ? "Image saved" : `${saved.length} images saved`)}
      />
    </section>
  );
}
