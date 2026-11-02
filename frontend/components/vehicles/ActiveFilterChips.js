"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTER_LABELS = {
  brand: "Brand",
  fuel_type: "Fuel",
  transmission: "Transmission",
  vehicle_type: "Type",
  min_price: "Min price",
  max_price: "Max price",
  min_mileage: "Min mileage",
  max_mileage: "Max mileage",
  seating_capacity: "Seats",
};

function formatChipValue(key, value) {
  if (key === "min_price" || key === "max_price") {
    const n = Number(value);
    if (!Number.isNaN(n)) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);
    }
  }
  return String(value);
}

/**
 * Removable chips for active list filters (excludes sort).
 */
export function ActiveFilterChips({
  filters = {},
  onClear,
  onResetAll,
  className,
}) {
  const chips = Object.keys(FILTER_LABELS)
    .filter((key) => {
      const value = filters[key];
      return value !== undefined && value !== null && value !== "";
    })
    .map((key) => ({
      key,
      label: FILTER_LABELS[key],
      value: formatChipValue(key, filters[key]),
    }));

  if (chips.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Active filters"
    >
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/70 py-0.5 pr-1 pl-2.5 text-xs font-medium text-foreground"
        >
          <span>
            {chip.label}: {chip.value}
          </span>
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onClear?.(chip.key)}
            aria-label={`Clear ${chip.label} filter`}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {typeof onResetAll === "function" ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onResetAll}
          aria-label="Reset all filters"
        >
          Reset All
        </Button>
      ) : null}
    </div>
  );
}
