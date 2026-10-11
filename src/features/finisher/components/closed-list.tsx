"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { finisherApi } from "../api";
import { formatFullDate, formatRelativeDate, type LocalDate } from "../domain/dates";
import { generalErrorMessage } from "../messages";
import type { ClosedEntry, ClosedOutcome, ClosedPage, ClosedType } from "../types";
import { RowList } from "./list-parts";

const OUTCOME_LABEL: Record<ClosedEntry["outcome"], string> = { done: "Done", finished: "Finished", let_go: "Let go" };

function ClosedRow({ entry, today }: { entry: ClosedEntry; today: LocalDate }) {
  const href = entry.kind === "task" ? `/finisher/tasks/${entry.id}` : `/finisher/projects/${entry.id}`;
  return (
    <li className="flex flex-col gap-1 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href} className="font-medium break-words underline-offset-4 hover:underline">
          {entry.title}
        </Link>
        <Badge variant={entry.outcome === "let_go" ? "outline" : "secondary"}>{OUTCOME_LABEL[entry.outcome]}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {entry.kind === "task" ? "Task" : "Project"} · closed{" "}
        <time dateTime={entry.closedAt}>{formatRelativeDate(entry.closedOn, today).replace(/^(Today|Yesterday)$/, (w) => w.toLowerCase())}</time>
        <span className="sr-only"> ({formatFullDate(entry.closedOn)})</span>
        {entry.durationDays !== null ? ` · ${entry.durationDays} ${entry.durationDays === 1 ? "day" : "days"} from start to close` : ""}
        {entry.sessions ? ` · ${entry.sessions.done} of ${entry.sessions.scheduled} sessions done` : ""}
      </p>
      {entry.note ? (
        <p className="text-sm break-words">
          <span className="text-muted-foreground">{entry.outcome === "let_go" ? "Reason: " : "Reflection: "}</span>
          {entry.note}
        </p>
      ) : null}
    </li>
  );
}

/** Closed entries with "Load more" (20 at a time). */
export function ClosedList(props: { type: ClosedType; outcome: ClosedOutcome; page: ClosedPage; today: LocalDate }) {
  const key = props.page.items.map((item) => item.id).join(",") + props.type + props.outcome;
  return <ClosedListInner key={key} {...props} />;
}

function ClosedListInner({ type, outcome, page, today }: { type: ClosedType; outcome: ClosedOutcome; page: ClosedPage; today: LocalDate }) {
  const [items, setItems] = useState(page.items);
  const [cursor, setCursor] = useState(page.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ type, outcome, cursor });
    const result = await finisherApi<{ page: ClosedPage }>("GET", `/api/finisher/closed?${query}`);
    setLoading(false);
    if (!result.ok) {
      setError(generalErrorMessage(result.error));
      return;
    }
    setItems((current) => [...current, ...result.data.page.items]);
    setCursor(result.data.page.nextCursor);
  }

  return (
    <div className="flex flex-col gap-2">
      <RowList label="Closed items">
        {items.map((entry) => (
          <ClosedRow key={`${entry.kind}-${entry.id}`} entry={entry} today={today} />
        ))}
      </RowList>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {cursor ? (
        <Button variant="outline" className="h-11 self-start" disabled={loading} onClick={loadMore}>
          {loading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
          Load more
        </Button>
      ) : null}
    </div>
  );
}
