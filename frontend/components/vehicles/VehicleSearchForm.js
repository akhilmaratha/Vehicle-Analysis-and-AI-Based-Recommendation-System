"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

  useEffect(() => {
    if (!initialValues) return;
    const timer = window.setTimeout(() => {
      setValues((prev) => ({ ...prev, ...initialValues }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialValues]);

  function update(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.(buildStructuredRecommendationPayload(values));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Structured preference form</CardTitle>
        <CardDescription>
          Fallback when you prefer filters over natural language. Uses the same
          recommendation engine (no invented results).
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="budget">Budget max (₹)</Label>
            <Input
              id="budget"
              name="budget"
              type="number"
              value={values.budget}
              onChange={(e) => update("budget", e.target.value)}
              required
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fuel_type">Fuel Type</Label>
            <select
              id="fuel_type"
              name="fuel_type"
              value={values.fuel_type}
              onChange={(e) => update("fuel_type", e.target.value)}
              className={selectClassName}
              disabled={disabled}
            >
              <option>Petrol</option>
              <option>Diesel</option>
              <option>CNG</option>
              <option>Hybrid</option>
              <option>Electric</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transmission">Transmission</Label>
            <select
              id="transmission"
              name="transmission"
              value={values.transmission}
              onChange={(e) => update("transmission", e.target.value)}
              className={selectClassName}
              disabled={disabled}
            >
              <option>Automatic</option>
              <option>Manual</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vehicle_type">Vehicle Type</Label>
            <select
              id="vehicle_type"
              name="vehicle_type"
              value={values.vehicle_type}
              onChange={(e) => update("vehicle_type", e.target.value)}
              className={selectClassName}
              disabled={disabled}
            >
              <option>SUV</option>
              <option>Sedan</option>
              <option>Hatchback</option>
              <option>MUV</option>
              <option>Coupe</option>
              <option>Other</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="minimum_mileage">Preferred mileage (km/l)</Label>
            <Input
              id="minimum_mileage"
              name="minimum_mileage"
              type="number"
              value={values.minimum_mileage}
              onChange={(e) => update("minimum_mileage", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seating_capacity">Seating Capacity</Label>
            <Input
              id="seating_capacity"
              name="seating_capacity"
              type="number"
              value={values.seating_capacity}
              onChange={(e) => update("seating_capacity", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Priorities</Label>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                ["priority_mileage", "Mileage"],
                ["priority_safety", "Safety"],
                ["priority_price", "Price"],
                ["priority_performance", "Performance"],
                ["priority_comfort", "Comfort"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(values[key])}
                    onChange={(e) => update(key, e.target.checked)}
                    disabled={disabled}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={disabled}>
            Find My Vehicle
          </Button>
          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  );
}
