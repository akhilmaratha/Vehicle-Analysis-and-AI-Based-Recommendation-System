"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { VehicleSearch } from "@/components/vehicles/VehicleSearch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Validate filter draft against backend constraints.
 * Returns { ok, errors, sanitized } — does not invent search/model filters.
 */
export function validateVehicleFilters(filters = {}) {
  const errors = {};
  const sanitized = { ...filters };

  const numberFields = [
    "min_price",
    "max_price",
    "min_mileage",
    "max_mileage",
    "seating_capacity",
  ];

  for (const key of numberFields) {
    const raw = filters[key];
    if (raw === undefined || raw === null || raw === "") {
      sanitized[key] = "";
      continue;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      errors[key] = "Must be a number";
      continue;
    }
    if (key === "seating_capacity") {
      if (!Number.isInteger(n) || n < 1) {
        errors[key] = "Must be a whole number ≥ 1";
      } else {
        sanitized[key] = String(n);
      }
      continue;
    }
    if (n < 0) {
      errors[key] = "Cannot be negative";
    } else {
      sanitized[key] = String(n);
    }
  }

  const minPrice = sanitized.min_price === "" ? null : Number(sanitized.min_price);
  const maxPrice = sanitized.max_price === "" ? null : Number(sanitized.max_price);
  if (
    minPrice != null &&
    maxPrice != null &&
    !Number.isNaN(minPrice) &&
    !Number.isNaN(maxPrice) &&
    minPrice > maxPrice
  ) {
    errors.min_price = "Min price must be ≤ max price";
    errors.max_price = "Max price must be ≥ min price";
  }

  const minMileage =
    sanitized.min_mileage === "" ? null : Number(sanitized.min_mileage);
  const maxMileage =
    sanitized.max_mileage === "" ? null : Number(sanitized.max_mileage);
  if (
    minMileage != null &&
    maxMileage != null &&
    !Number.isNaN(minMileage) &&
    !Number.isNaN(maxMileage) &&
    minMileage > maxMileage
  ) {
    errors.min_mileage = "Min mileage must be ≤ max mileage";
    errors.max_mileage = "Max mileage must be ≥ min mileage";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

/**
 * Advanced filters matching GET /api/vehicles query params.
 * Desktop: always-visible panel. Mobile: collapsible drawer with Apply/Reset.
 */
export function VehicleFilters({
  filters,
  onChange,
  onApply,
  onReset,
  errors = {},
  className,
  mobileOpen,
  onMobileOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof mobileOpen === "boolean";
  const open = isControlled ? mobileOpen : internalOpen;

  function setOpen(next) {
    if (isControlled) {
      onMobileOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  }

  function update(key, value) {
    onChange?.({ ...filters, [key]: value });
  }

  function handleApply() {
    onApply?.();
    setOpen(false);
  }

  function handleReset() {
    onReset?.();
  }

  const form = (
    <div className="space-y-4">
      <VehicleSearch
        value={filters.brand || ""}
        onChange={(value) => update("brand", value)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="grid gap-2">
          <Label htmlFor="filter-fuel">Fuel type</Label>
          <select
            id="filter-fuel"
            className={selectClassName}
            value={filters.fuel_type || ""}
            onChange={(e) => update("fuel_type", e.target.value)}
          >
            <option value="">Any</option>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="CNG">CNG</option>
            <option value="Electric">Electric</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="filter-transmission">Transmission</Label>
          <select
            id="filter-transmission"
            className={selectClassName}
            value={filters.transmission || ""}
            onChange={(e) => update("transmission", e.target.value)}
          >
            <option value="">Any</option>
            <option value="Manual">Manual</option>
            <option value="Automatic">Automatic</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="filter-type">Vehicle type</Label>
          <select
            id="filter-type"
            className={selectClassName}
            value={filters.vehicle_type || ""}
            onChange={(e) => update("vehicle_type", e.target.value)}
          >
            <option value="">Any</option>
            <option value="Hatchback">Hatchback</option>
            <option value="Sedan">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="MUV">MUV</option>
            <option value="Coupe">Coupe</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="filter-min-price">Min price (₹)</Label>
          <Input
            id="filter-min-price"
            type="number"
            min="0"
            inputMode="decimal"
            placeholder="e.g. 500000"
            value={filters.min_price || ""}
            onChange={(e) => update("min_price", e.target.value)}
            aria-invalid={Boolean(errors.min_price)}
            aria-describedby={errors.min_price ? "err-min-price" : undefined}
          />
          <FieldError id="err-min-price" message={errors.min_price} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="filter-max-price">Max price (₹)</Label>
          <Input
            id="filter-max-price"
            type="number"
            min="0"
            inputMode="decimal"
            placeholder="e.g. 1500000"
            value={filters.max_price || ""}
            onChange={(e) => update("max_price", e.target.value)}
            aria-invalid={Boolean(errors.max_price)}
            aria-describedby={errors.max_price ? "err-max-price" : undefined}
          />
          <FieldError id="err-max-price" message={errors.max_price} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="filter-min-mileage">Min mileage</Label>
          <Input
            id="filter-min-mileage"
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            placeholder="e.g. 15"
            value={filters.min_mileage || ""}
            onChange={(e) => update("min_mileage", e.target.value)}
            aria-invalid={Boolean(errors.min_mileage)}
            aria-describedby={
              errors.min_mileage ? "err-min-mileage" : undefined
            }
          />
          <FieldError id="err-min-mileage" message={errors.min_mileage} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="filter-max-mileage">Max mileage</Label>
          <Input
            id="filter-max-mileage"
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            placeholder="e.g. 30"
            value={filters.max_mileage || ""}
            onChange={(e) => update("max_mileage", e.target.value)}
            aria-invalid={Boolean(errors.max_mileage)}
            aria-describedby={
              errors.max_mileage ? "err-max-mileage" : undefined
            }
          />
          <FieldError id="err-max-mileage" message={errors.max_mileage} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="filter-seating">Seating capacity</Label>
          <Input
            id="filter-seating"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="Exact seats"
            value={filters.seating_capacity || ""}
            onChange={(e) => update("seating_capacity", e.target.value)}
            aria-invalid={Boolean(errors.seating_capacity)}
            aria-describedby={
              errors.seating_capacity ? "err-seating" : undefined
            }
          />
          <FieldError id="err-seating" message={errors.seating_capacity} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          className="lg:hidden"
          onClick={handleApply}
        >
          Apply Filters
        </Button>
        {typeof onReset === "function" ? (
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset All
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className={cn(className)}>
      {/* Mobile trigger */}
      <div className="mb-4 lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          aria-expanded={open}
          aria-controls="vehicle-filters-panel"
          onClick={() => setOpen(!open)}
        >
          <Filter className="size-4" aria-hidden="true" />
          {open ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      {/* Mobile drawer overlay */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <Card
        id="vehicle-filters-panel"
        className={cn(
          "border-border/80 shadow-sm",
          "lg:static lg:z-auto lg:block lg:translate-x-0",
          open
            ? "fixed inset-y-0 left-0 z-50 flex w-[min(100%,22rem)] translate-x-0 flex-col overflow-y-auto rounded-none lg:rounded-xl"
            : "hidden lg:block"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
          <div className="flex items-center gap-1">
            {typeof onReset === "function" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden lg:inline-flex"
                onClick={handleReset}
              >
                Reset
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
            >
              <X className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>{form}</CardContent>
      </Card>
    </div>
  );
}
