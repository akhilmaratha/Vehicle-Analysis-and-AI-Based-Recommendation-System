"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Brand search control mapped to backend `brand` (case-insensitive exact match).
 *
 * Backend does NOT expose a general search or `model` query param. This control
 * intentionally only sets `brand` — no client-side fake model/search filtering.
 */
export function VehicleSearch({
  value = "",
  onChange,
  id = "vehicle-search-brand",
  className,
  disabled = false,
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>Brand</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="search"
          autoComplete="off"
          placeholder="e.g. Hyundai"
          className="pl-9"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          aria-describedby={`${id}-hint`}
        />
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        Matches the full brand name.
      </p>
    </div>
  );
}
