"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
    ? [{ value: null, label: anyLabel }, ...normalized]
    : normalized;

  return (
    <Select
      items={items}
      value={value === "" || value == null ? null : value}
      onValueChange={(next) => onChange(next == null ? "" : String(next))}
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
          <SelectItem key={item.value ?? "__any"} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
