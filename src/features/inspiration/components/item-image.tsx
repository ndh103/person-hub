import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A stored image from a signed link (ADR-0009). A missing link or a failed
 * load shows "Image unavailable" instead (INS-002); the rest of the entry
 * still works.
 */
export function ItemImage({
  src,
  alt,
  className,
  fit = "cover",
}: {
  src: string | null;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
        <span className="flex flex-col items-center gap-1 text-xs">
          <ImageIcon className="size-5" aria-hidden="true" />
          Image unavailable
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={cn("bg-muted", fit === "cover" ? "object-cover" : "object-contain", className)}
    />
  );
}
