"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { VehicleSearch } from "@/components/vehicles/VehicleSearch";
import { ChoiceChips } from "@/components/forms/ChoiceChips";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_TYPES } from "@/lib/vehicle-options";
import { cn } from "@/lib/utils";

const FILTER_KEYS = [
  "brand",
  "fuel_type",
  "transmission",
  "vehicle_type",
  "min_price",
  "max_price",
  "min_mileage",
  "max_mileage",
  "seating_capacity",
];

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

export function countActiveFilters(filters = {}) {
  return FILTER_KEYS.filter((key) => Boolean(filters[key])).length;
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function FilterGroup({ title, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 font-heading text-sm font-bold text-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function RangeInputs({ idPrefix, minKey, maxKey, filters, update, errors, unit, placeholders, step }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: minKey, label: "Min", placeholder: placeholders[0] },
          { key: maxKey, label: "Max", placeholder: placeholders[1] },
        ].map((field) => {
          const id = `${idPrefix}-${field.key}`;
          return (
            <div key={field.key} className="grid gap-1.5">
              <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
                {field.label} {unit}
              </Label>
              <Input
                id={id}
                type="number"
                min="0"
                step={step}
                inputMode="decimal"
                placeholder={field.placeholder}
                value={filters[field.key] || ""}
                onChange={(e) => update(field.key, e.target.value)}
                aria-invalid={Boolean(errors[field.key]) || undefined}
                aria-describedby={errors[field.key] ? `${id}-error` : undefined}
              />
            </div>
          );
        })}
      </div>
      <FieldError id={`${idPrefix}-${minKey}-error`} message={errors[minKey]} />
      {errors[maxKey] && errors[maxKey] !== errors[minKey] ? (
        <FieldError id={`${idPrefix}-${maxKey}-error`} message={errors[maxKey]} />
      ) : null}
    </div>
  );
}

function FilterFields({ filters, update, errors, idPrefix }) {
  return (
    <div className="space-y-6">
      <VehicleSearch
        id={`${idPrefix}-brand`}
        value={filters.brand || ""}
        onChange={(value) => update("brand", value)}
      />
      <Separator />
      <FilterGroup title="Fuel type">
        <ChoiceChips
          label="Fuel type"
          options={FUEL_TYPES}
          value={filters.fuel_type || ""}
          onChange={(value) => update("fuel_type", value)}
        />
      </FilterGroup>
      <FilterGroup title="Transmission">
        <ChoiceChips
          label="Transmission"
          options={TRANSMISSIONS}
          value={filters.transmission || ""}
          onChange={(value) => update("transmission", value)}
        />
      </FilterGroup>
      <FilterGroup title="Vehicle type">
        <ChoiceChips
          label="Vehicle type"
          options={VEHICLE_TYPES}
          value={filters.vehicle_type || ""}
          onChange={(value) => update("vehicle_type", value)}
        />
      </FilterGroup>
      <Separator />
      <FilterGroup title="Price">
        <RangeInputs
          idPrefix={idPrefix}
          minKey="min_price"
          maxKey="max_price"
          unit="(₹)"
          step="10000"
          placeholders={["500000", "1500000"]}
          filters={filters}
          update={update}
          errors={errors}
        />
      </FilterGroup>
      <FilterGroup title="Mileage">
        <RangeInputs
          idPrefix={idPrefix}
          minKey="min_mileage"
          maxKey="max_mileage"
          unit="(km/l)"
          step="0.1"
          placeholders={["15", "30"]}
          filters={filters}
          update={update}
          errors={errors}
        />
      </FilterGroup>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-seating`} className="font-heading font-bold">
          Seating capacity
        </Label>
        <Input
          id={`${idPrefix}-seating`}
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder="Exact number of seats"
          value={filters.seating_capacity || ""}
          onChange={(e) => update("seating_capacity", e.target.value)}
          aria-invalid={Boolean(errors.seating_capacity) || undefined}
          aria-describedby={errors.seating_capacity ? `${idPrefix}-seating-error` : undefined}
        />
        <FieldError id={`${idPrefix}-seating-error`} message={errors.seating_capacity} />
      </div>
    </div>
  );
}

/**
 * Advanced filters matching GET /api/vehicles query params.
 * Desktop: sticky sidebar panel. Mobile: Sheet with Apply / Clear.
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
  appliedCount,
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

  const activeCount = appliedCount ?? countActiveFilters(filters);

  return (
    <div className={cn(className)}>
      <div className="lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
          </span>
          {activeCount > 0 ? (
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular">
              {activeCount}
            </span>
          ) : null}
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-[92%] max-w-sm gap-0 bg-background p-0">
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle className="font-heading text-lg font-bold">Filters</SheetTitle>
              <SheetDescription>Changes apply when you tap Show results.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FilterFields
                filters={filters}
                update={update}
                errors={errors}
                idPrefix="mobile-filter"
              />
            </div>
            <SheetFooter className="flex-row border-t border-border bg-card px-5 py-4">
              {typeof onReset === "function" ? (
                <Button type="button" variant="outline" className="flex-1" onClick={onReset}>
                  Clear all
                </Button>
              ) : null}
              <Button type="button" className="flex-1" onClick={handleApply}>
                Show results
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden rounded-xl border border-border bg-card lg:block">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-heading text-base font-bold">Filters</h2>
          {typeof onReset === "function" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-2 text-muted-foreground"
              onClick={onReset}
            >
              Clear all
            </Button>
          ) : null}
        </div>
        <div className="px-5 py-5">
          <FilterFields
            filters={filters}
            update={update}
            errors={errors}
            idPrefix="filter"
          />
        </div>
      </div>
    </div>
  );
}
