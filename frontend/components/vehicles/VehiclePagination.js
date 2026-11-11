"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Compact page list with ellipses, e.g. 1 … 4 5 6 … 12 */
function pageWindow(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push(`gap-${page}`);
    result.push(page);
  });
  return result;
}

/**
 * Pagination driven by backend metadata { page, pages, total, limit }.
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
    <nav
      className={cn(
        "flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row",
        className
      )}
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground tabular" aria-live="polite">
        {total > 0 && limit ? (
          <>
            Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span>
          </>
        ) : (
          <>
            Page {safePage} of {safePages}
          </>
        )}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange?.(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div className="hidden items-center gap-1.5 sm:flex">
          {pageWindow(safePage, safePages).map((item) =>
            typeof item === "string" ? (
              <span key={item} className="px-1 text-sm text-muted-foreground" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant={item === safePage ? "default" : "ghost"}
                size="icon"
                className="tabular"
                disabled={disabled}
                aria-current={item === safePage ? "page" : undefined}
                aria-label={`Page ${item}`}
                onClick={() => item !== safePage && onPageChange?.(item)}
              >
                {item}
              </Button>
            )
          )}
        </div>
        <span className="px-2 text-sm text-muted-foreground tabular sm:hidden">
          {safePage} / {safePages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || safePage >= safePages}
          onClick={() => onPageChange?.(safePage + 1)}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
