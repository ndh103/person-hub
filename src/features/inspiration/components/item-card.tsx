import { FileTextIcon } from "lucide-react";
import { Link } from "@/components/link";
import { isSafeLink } from "@/lib/text";
import type { InspirationListItem } from "../types";
import { imageAlt } from "../messages";
import { ItemImage } from "./item-image";

function host(link: string | null): string | null {
  if (!link || !isSafeLink(link)) return null;
  try {
    return new URL(link).host;
  } catch {
    return null;
  }
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {tags.slice(0, 3).map((tag) => (
        <span key={tag} className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {tag}
        </span>
      ))}
    </span>
  );
}

/**
 * One entry in the grid (INS-002). The whole card is a single link to the
 * detail page; all content is rendered as text.
 */
export function ItemCard({ item }: { item: InspirationListItem }) {
  const cardClass =
    "group block h-full overflow-hidden rounded-2xl border border-border bg-card text-card-foreground outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  if (item.kind === "image") {
    return (
      <Link to="/inspiration/$id" params={{ id: item.id }} data-item-link={item.id} className={cardClass}>
        <ItemImage src={item.thumbUrl} alt={imageAlt(item)} className="aspect-[4/3] w-full" />
        {item.title || item.tags.length ? (
          <span className="block p-3">
            {item.title ? <span className="line-clamp-2 text-sm font-medium [overflow-wrap:anywhere]">{item.title}</span> : null}
            <Tags tags={item.tags} />
          </span>
        ) : null}
      </Link>
    );
  }
  const site = host(item.link);
  return (
    <Link to="/inspiration/$id" params={{ id: item.id }} data-item-link={item.id} className={`${cardClass} p-3`}>
      <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <FileTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">Article{site ? ` · ${site}` : ""}</span>
      </span>
      <span className="mt-2 line-clamp-2 font-heading text-lg leading-snug font-medium [overflow-wrap:anywhere]">{item.title}</span>
      {item.excerpt ? <span className="mt-1.5 line-clamp-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">{item.excerpt}</span> : null}
      <Tags tags={item.tags} />
    </Link>
  );
}
