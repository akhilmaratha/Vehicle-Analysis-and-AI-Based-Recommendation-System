"use client";

import { cn } from "@/lib/utils";

function normalize(options) {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
}

/**
 * Toggle chips. Single mode: `value` is a string and clicking the active chip
 * clears it. Multiple mode: `value` is an array of selected values.
 */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
  multiple = false,
  disabled = false,
  className,
}) {
  const selected = multiple ? new Set(value || []) : null;

  function toggle(optionValue) {
    if (multiple) {
      const next = new Set(selected);
      if (next.has(optionValue)) next.delete(optionValue);
      else next.add(optionValue);
      onChange(options.map((o) => (typeof o === "string" ? o : o.value)).filter((v) => next.has(v)));
      return;
    }
    onChange(value === optionValue ? "" : optionValue);
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group" aria-label={label}>
      {normalize(options).map((option) => {
        const active = multiple ? selected.has(option.value) : value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => toggle(option.value)}
            className={cn(
              "h-9 rounded-md border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-card text-foreground hover:border-foreground/30 hover:bg-secondary"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
