"use client";

import { useEffect, useState } from "react";
import { FieldSelect } from "@/components/forms/FieldSelect";
import { ChoiceChips } from "@/components/forms/ChoiceChips";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_TYPES } from "@/lib/vehicle-options";

const defaultValues = {
  budget: "1500000",
  fuel_type: "Petrol",
  transmission: "Automatic",
  vehicle_type: "SUV",
  minimum_mileage: "15",
  seating_capacity: "5",
  priority_mileage: true,
  priority_safety: true,
  priority_price: false,
  priority_performance: false,
  priority_comfort: false,
};

const PRIORITY_FIELDS = [
  { value: "priority_mileage", label: "Mileage" },
  { value: "priority_safety", label: "Safety" },
  { value: "priority_price", label: "Price" },
  { value: "priority_performance", label: "Performance" },
  { value: "priority_comfort", label: "Comfort" },
];

function FieldError({ name, errors }) {
  return errors[name] ? (
    <p id={`${name}-error`} className="text-xs text-destructive" role="alert">
      {errors[name]}
    </p>
  ) : null;
}

/**
 * Build Phase 3.1 RecommendationRequest-compatible payload.
 * @param {Record<string, unknown>} values
 */
export function buildStructuredRecommendationPayload(values) {
  const priorities = [];
  if (values.priority_price) priorities.push("price");
  if (values.priority_mileage) priorities.push("mileage");
  if (values.priority_safety) priorities.push("safety");
  if (values.priority_performance) priorities.push("performance");
  if (values.priority_comfort) priorities.push("comfort");

  const payload = {
    budget: Number(values.budget),
    fuel_type: values.fuel_type || undefined,
    transmission: values.transmission || undefined,
    vehicle_type: values.vehicle_type || undefined,
    priorities,
  };

  const mileage = Number(values.minimum_mileage);
  if (!Number.isNaN(mileage) && values.minimum_mileage !== "") {
    payload.minimum_mileage = mileage;
  }
  const seats = Number(values.seating_capacity);
  if (!Number.isNaN(seats) && values.seating_capacity !== "") {
    payload.seating_capacity = seats;
  }

  return payload;
}

export function VehicleSearchForm({
  onSubmit,
  message,
  disabled = false,
  initialValues = null,
}) {
  const [values, setValues] = useState(() => ({
    ...defaultValues,
    ...(initialValues || {}),
  }));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!initialValues) return;
    const timer = window.setTimeout(() => {
      setValues((prev) => ({ ...prev, ...initialValues }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialValues]);

  function update(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const budget = Number(values.budget);
    if (values.budget === "" || Number.isNaN(budget) || budget <= 0) {
      nextErrors.budget = "Enter a budget so we can find vehicles within it.";
    }
    const seats = values.seating_capacity === "" ? null : Number(values.seating_capacity);
    if (seats != null && (!Number.isInteger(seats) || seats < 1)) {
      nextErrors.seating_capacity = "Use a whole number of seats.";
    }
    const mileage = values.minimum_mileage === "" ? null : Number(values.minimum_mileage);
    if (mileage != null && (Number.isNaN(mileage) || mileage < 0)) {
      nextErrors.minimum_mileage = "Mileage cannot be negative.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit?.(buildStructuredRecommendationPayload(values));
  }

  const selectedPriorities = PRIORITY_FIELDS.filter((field) => values[field.value]).map(
    (field) => field.value
  );

  function setPriorities(next) {
    setValues((prev) => {
      const updated = { ...prev };
      for (const field of PRIORITY_FIELDS) updated[field.value] = next.includes(field.value);
      return updated;
    });
  }

  function errorProps(key) {
    return errors[key]
      ? { "aria-invalid": true, "aria-describedby": `${key}-error` }
      : {};
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card" noValidate>
      <div className="space-y-1.5 border-b border-border p-5 sm:px-7 sm:py-6">
        <h2 className="font-heading text-lg font-bold">Tell us your preferences</h2>
        <p className="text-sm text-muted-foreground">
          Set your budget and the basics. We will rank matching vehicles from the catalog.
        </p>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="budget">Maximum budget (₹)</Label>
          <Input
            id="budget"
            name="budget"
            type="number"
            inputMode="numeric"
            min="0"
            step="10000"
            value={values.budget}
            onChange={(e) => update("budget", e.target.value)}
            disabled={disabled}
            {...errorProps("budget")}
          />
          <FieldError name="budget" errors={errors} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fuel_type">Fuel type</Label>
          <FieldSelect
            id="fuel_type"
            value={values.fuel_type}
            onChange={(v) => update("fuel_type", v)}
            options={FUEL_TYPES}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="transmission">Transmission</Label>
          <FieldSelect
            id="transmission"
            value={values.transmission}
            onChange={(v) => update("transmission", v)}
            options={TRANSMISSIONS}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vehicle_type">Vehicle type</Label>
          <FieldSelect
            id="vehicle_type"
            value={values.vehicle_type}
            onChange={(v) => update("vehicle_type", v)}
            options={VEHICLE_TYPES}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="minimum_mileage">Preferred mileage (km/l)</Label>
          <Input
            id="minimum_mileage"
            name="minimum_mileage"
            type="number"
            inputMode="decimal"
            min="0"
            value={values.minimum_mileage}
            onChange={(e) => update("minimum_mileage", e.target.value)}
            disabled={disabled}
            {...errorProps("minimum_mileage")}
          />
          <FieldError name="minimum_mileage" errors={errors} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="seating_capacity">Seating capacity</Label>
          <Input
            id="seating_capacity"
            name="seating_capacity"
            type="number"
            inputMode="numeric"
            min="1"
            value={values.seating_capacity}
            onChange={(e) => update("seating_capacity", e.target.value)}
            disabled={disabled}
            {...errorProps("seating_capacity")}
          />
          <FieldError name="seating_capacity" errors={errors} />
        </div>
        <div className="grid gap-2.5 sm:col-span-2 lg:col-span-3">
          <p className="text-sm font-medium">
            Priorities
          </p>
          <ChoiceChips
            label="Priorities"
            multiple
            options={PRIORITY_FIELDS}
            value={selectedPriorities}
            onChange={setPriorities}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-3 border-t border-border bg-secondary/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
        {message ? <p className="text-sm text-muted-foreground sm:mr-auto">{message}</p> : null}
        <Button type="submit" size="lg" disabled={disabled}>
          Show recommendations
        </Button>
      </div>
    </form>
  );
}
