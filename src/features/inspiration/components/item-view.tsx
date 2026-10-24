import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeftIcon, CircleAlertIcon, ExternalLinkIcon, PencilIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Link } from "@/components/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { formatDate, instantToLocalDate } from "@/lib/dates";
import { isSafeLink, shortLink } from "@/lib/text";
import { inspirationKeys, inspirationQueries, InspirationLoadError } from "../api";
import { DeleteItemDialog } from "./delete-item-dialog";
import { ItemFormDialog } from "./item-form-dialog";
import { imageAlt } from "../messages";
import { ItemImage } from "./item-image";

function BackLink() {
  return (
    <Link to="/inspiration" className="inline-flex min-h-11 items-center gap-2 self-start rounded-md text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      Inspiration
    </Link>
  );
}

/**
 * One entry (INS-005) with Edit (INS-006) and Delete (INS-007). Another
 * user's entry and a missing one look the same: "Entry not found". All
 * content is rendered as text, never as HTML.
 */
export function ItemView({ id, onTag, onDeleted }: { id: string; onTag: (tag: string) => void; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const query = useQuery(inspirationQueries.item(id));
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <span className="sr-only" role="status">
          Loading…
        </span>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="aspect-[3/2] w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }

  if (query.isError) {
    const missing = query.error instanceof InspirationLoadError && query.error.code === "not_found";
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        {missing ? (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyTitle className="font-heading text-xl font-medium">Entry not found</EmptyTitle>
              <EmptyDescription>It may have been deleted.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" className="h-11" nativeButton={false} render={<Link to="/inspiration" />}>
                Back to Inspiration
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Alert variant="destructive" role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <CircleAlertIcon />
            <div className="flex-1">
              <AlertTitle>Couldn’t load this entry</AlertTitle>
              <AlertDescription>Check your connection and try again.</AlertDescription>
            </div>
            <Button variant="outline" className="h-11 self-start sm:self-auto" onClick={() => void query.refetch()}>
              <RefreshCwIcon data-icon="inline-start" />
              Try again
            </Button>
          </Alert>
        )}
      </div>
    );
  }

  const item = query.data;
  // Defence in depth: only http(s) links ever become clickable, whatever the API returned.
  const link = item.link && isSafeLink(item.link) ? item.link : null;
  const added = formatDate(instantToLocalDate(item.createdAt));
  const updated = item.updatedAt !== item.createdAt ? formatDate(instantToLocalDate(item.updatedAt)) : null;
  const image = item.kind === "image";

  return (
    <article aria-labelledby="item-title" className="flex flex-col gap-4">
      <BackLink />
      {image ? (
        <ItemImage src={item.imageUrl} alt={imageAlt(item)} fit="contain" className="max-h-[70dvh] w-full rounded-2xl" />
      ) : null}
      <div className="flex flex-col gap-1">
        <h1 id="item-title" tabIndex={-1} className="font-heading text-2xl font-medium outline-none [overflow-wrap:anywhere] lg:text-3xl">
          {item.title ?? (image ? "Untitled image" : "")}
        </h1>
        <p className="font-mono text-xs text-muted-foreground">
          {image ? "Image" : "Article"} · Added {added}
          {updated ? ` · Updated ${updated}` : null}
        </p>
      </div>
      {link ? (
        <p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-accent-foreground underline underline-offset-4"
          >
            <span className="[overflow-wrap:anywhere]">{shortLink(link, 64)}</span>
            <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      ) : null}
      {item.tags.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {item.tags.map((tag) => (
            <li key={tag}>
              <Button variant="secondary" className="h-11 rounded-full px-3 font-mono text-xs" onClick={() => onTag(tag)}>
                {tag}
                <span className="sr-only"> (show entries with this tag)</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {item.notes ? (
        <section aria-labelledby="item-notes" className="rounded-xl bg-muted p-4">
          <h2 id="item-notes" className="font-mono text-xs text-muted-foreground">
            Why it inspires me
          </h2>
          <p className="mt-1 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{item.notes}</p>
        </section>
      ) : null}
      {item.body ? (
        <section aria-labelledby="item-body">
          <h2 id="item-body" className="font-mono text-xs text-muted-foreground">
            Article text
          </h2>
          <div className="mt-2 max-w-[68ch] font-heading text-[1.0625rem] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{item.body}</div>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11" onClick={() => setEditOpen(true)}>
          <PencilIcon data-icon="inline-start" aria-hidden="true" />
          Edit
        </Button>
        <Button variant="outline" className="h-11 text-destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2Icon data-icon="inline-start" aria-hidden="true" />
          Delete
        </Button>
      </div>

      <ItemFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        kind={item.kind}
        item={item}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: inspirationKeys.all });
          toast.add({ title: "Entry updated", type: "success" });
        }}
      />
      <DeleteItemDialog
        item={item}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          // Drop the entry before refreshing, so this page doesn't refetch it into "not found".
          queryClient.removeQueries({ queryKey: inspirationQueries.item(id).queryKey });
          void queryClient.invalidateQueries({ queryKey: inspirationKeys.all });
          toast.add({ title: "Entry deleted", type: "success" });
          onDeleted();
        }}
      />
    </article>
  );
}
