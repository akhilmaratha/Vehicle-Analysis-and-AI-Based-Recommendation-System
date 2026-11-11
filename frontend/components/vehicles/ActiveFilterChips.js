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
  if (key === "min_mileage" || key === "max_mileage") {
    return `${value} km/l`;
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
          className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/15 bg-sage py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary"
        >
          <span>
            <span className="text-primary/70">{chip.label}:</span> {chip.value}
          </span>
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded text-primary/70 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => onClear?.(chip.key)}
            aria-label={`Clear ${chip.label} filter`}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
      {typeof onResetAll === "function" ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-1 text-muted-foreground hover:text-foreground"
          onClick={onResetAll}
        >
          Clear all
        </Button>
      ) : null}
    </div>
  );
}
