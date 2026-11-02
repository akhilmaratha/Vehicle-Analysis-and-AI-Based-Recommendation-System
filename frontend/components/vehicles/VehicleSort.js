"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto sm:min-w-[220px]";

/**
 * Backend-supported sort presets:
 * sort_by: price | mileage | created_at
 * sort_order: asc | desc
 */
export const SORT_PRESETS = [
  {
    value: "created_at:desc",
    label: "Newest First",
    sort_by: "created_at",
    sort_order: "desc",
  },
  {
    value: "price:asc",
    label: "Price: Low → High",
    sort_by: "price",
    sort_order: "asc",
  },
  {
    value: "price:desc",
    label: "Price: High → Low",
    sort_by: "price",
    sort_order: "desc",
  },
  {
    value: "mileage:desc",
    label: "Mileage: High → Low",
    sort_by: "mileage",
    sort_order: "desc",
  },
];

export function sortValueFromFilters(filters = {}) {
  const by = filters.sort_by || "created_at";
  const order = filters.sort_order || "desc";
  const match = SORT_PRESETS.find(
    (preset) => preset.sort_by === by && preset.sort_order === order
  );
  return match?.value || "created_at:desc";
}

export function parseSortValue(value) {
  const preset = SORT_PRESETS.find((item) => item.value === value);
  if (preset) {
    return { sort_by: preset.sort_by, sort_order: preset.sort_order };
  }
  return { sort_by: "created_at", sort_order: "desc" };
}

export function VehicleSort({
  value,
  onChange,
  id = "vehicle-sort",
  className,
  disabled = false,
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 sm:flex-row sm:items-center", className)}>
      <Label htmlFor={id} className="shrink-0 text-sm">
        Sort
      </Label>
      <select
        id={id}
        className={selectClassName}
        value={value || "created_at:desc"}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label="Sort vehicles"
      >
        {SORT_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
