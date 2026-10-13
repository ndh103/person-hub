import { ChevronDownIcon, ExternalLinkIcon, LinkIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDate, instantToLocalDate, type LocalDate } from "@/lib/dates";
import { isSafeLink } from "../domain/validation";
import type { EventItem } from "../types";

/** "shop.example.com/tv001": host and path, shortened for display. */
function shortLink(url: string): string {
  try {
    const parsed = new URL(url);
    const text = parsed.host + (parsed.pathname === "/" ? "" : parsed.pathname);
    return text.length > 48 ? `${text.slice(0, 47)}…` : text;
  } catch {
    return url;
  }
}

/**
 * One event (EVT-002 summary, EVT-004 details). The whole summary is the
 * disclosure button; the panel holds the full notes, the link and the actions.
 * All content is rendered as text, never as HTML.
 */
export function EventRow({
  event,
  today,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  event: EventItem;
  today: LocalDate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (opener: HTMLElement) => void;
  onDelete: () => void;
}) {
  const upcoming = event.date > today;
  // Defence in depth: only http(s) links ever become clickable, whatever the API returned.
  const link = event.link && isSafeLink(event.link) ? event.link : null;
  const firstLine = event.notes?.split("\n")[0];
  const added = formatDate(instantToLocalDate(event.createdAt));
  const updated = event.updatedAt !== event.createdAt ? formatDate(instantToLocalDate(event.updatedAt)) : null;

  return (
    <li>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          data-event-trigger={event.id}
          className="group flex w-full items-start gap-3 p-4 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium [overflow-wrap:anywhere]">{event.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.8125rem] text-muted-foreground">
              <time dateTime={event.time ? `${event.date}T${event.time}` : event.date}>
                {formatDate(event.date)}
                {event.time ? ` · ${event.time}` : null}
              </time>
              {link ? (
                <span className="inline-flex items-center">
                  <LinkIcon className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Has a link</span>
                </span>
              ) : null}
              {upcoming ? (
                <Badge variant="outline" className="border-primary/60 bg-card font-mono text-accent-foreground">
                  Upcoming
                </Badge>
              ) : null}
            </span>
            {firstLine && !open ? <span className="mt-1 block truncate text-sm text-muted-foreground">{firstLine}</span> : null}
          </span>
          <ChevronDownIcon
            className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          {event.notes ? <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{event.notes}</p> : null}
          {link ? (
            <p className="mt-3">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-accent-foreground underline underline-offset-4"
              >
                <span className="[overflow-wrap:anywhere]">{shortLink(link)}</span>
                <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          ) : null}
          {!event.notes && !link ? <p className="text-sm text-muted-foreground">No notes or link.</p> : null}
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Added {added}
            {updated ? ` · Updated ${updated}` : null}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" className="h-11" onClick={(e) => onEdit(e.currentTarget)}>
              <PencilIcon data-icon="inline-start" aria-hidden="true" />
              Edit<span className="sr-only"> {event.title}</span>
            </Button>
            <Button variant="outline" className="h-11 text-destructive" onClick={onDelete}>
              <Trash2Icon data-icon="inline-start" aria-hidden="true" />
              Delete<span className="sr-only"> {event.title}</span>
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
