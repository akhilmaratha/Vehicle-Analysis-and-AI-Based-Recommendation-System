"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Prev/Next pagination driven by backend metadata { page, pages, total, limit }.
 */
export function VehiclePagination({
  page = 1,
  pages = 1,
  total = 0,
  limit,
  onPageChange,
  className,
  disabled = false,
}) {
  if (pages <= 1) return null;

  const safePage = Math.max(1, page);
  const safePages = Math.max(1, pages);
  const from = total === 0 ? 0 : (safePage - 1) * (limit || 0) + 1;
  const to =
    total === 0
      ? 0
      : Math.min(safePage * (limit || total), total);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row",
        className
      )}
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {safePage} of {safePages}
        {total > 0 && limit ? (
          <span className="ml-1">
            · showing {from}–{to} of {total}
          </span>
        ) : total > 0 ? (
          <span className="ml-1">· {total} total</span>
        ) : null}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange?.(safePage - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || safePage >= safePages}
          onClick={() => onPageChange?.(safePage + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
