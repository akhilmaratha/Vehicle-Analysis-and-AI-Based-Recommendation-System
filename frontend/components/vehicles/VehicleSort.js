"use client";

import { FieldSelect } from "@/components/forms/FieldSelect";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Backend-supported sort presets:
 * sort_by: price | mileage | created_at
 * sort_order: asc | desc
 */
export const SORT_PRESETS = [
  {
    value: "created_at:desc",
    label: "Newest first",
    sort_by: "created_at",
    sort_order: "desc",
  },
  {
    value: "price:asc",
    label: "Price: low to high",
    sort_by: "price",
    sort_order: "asc",
  },
  {
    value: "price:desc",
    label: "Price: high to low",
    sort_by: "price",
    sort_order: "desc",
  },
  {
    value: "mileage:desc",
    label: "Mileage: highest first",
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
    <div className={cn("flex items-center gap-2.5", className)}>
      <Label htmlFor={id} className="shrink-0 text-sm text-muted-foreground">
        Sort by
      </Label>
      <FieldSelect
        id={id}
        value={value || "created_at:desc"}
        onChange={(next) => onChange?.(next || "created_at:desc")}
        options={SORT_PRESETS.map(({ value: v, label }) => ({ value: v, label }))}
        disabled={disabled}
        className="min-w-0 sm:w-56"
      />
    </div>
  );
}
