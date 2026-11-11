"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Sentinel for the clearing / "Any" option — Base UI Select values must be strings. */
const ANY_VALUE = "__any__";

function normalizeOptions(options) {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
}

/**
 * shadcn Select bound to a string value. Empty string means "no selection";
 * pass `anyLabel` to render an explicit clearing option.
 */
export function FieldSelect({
  id,
  value,
  onChange,
  options,
  anyLabel,
  placeholder = "Select",
  disabled = false,
  invalid = false,
  className,
  size = "default",
  "aria-describedby": describedBy,
}) {
  const normalized = normalizeOptions(options);
  const items = anyLabel
    ? [{ value: ANY_VALUE, label: anyLabel }, ...normalized]
    : normalized;
  const isEmpty = value === "" || value == null;
  const selectValue = isEmpty ? (anyLabel ? ANY_VALUE : null) : value;

  return (
    <Select
      items={items}
      value={selectValue}
      onValueChange={(next) =>
        onChange(next == null || next === ANY_VALUE ? "" : String(next))
      }
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder={anyLabel || placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
