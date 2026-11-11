"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { FieldSelect } from "@/components/forms/FieldSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FUEL_TYPES, VEHICLE_TYPES } from "@/lib/vehicle-options";
import { cn } from "@/lib/utils";

/**
 * Quick search that navigates to /vehicles with backend-supported query params
 * (brand, max_price, fuel_type, vehicle_type).
 */
export function HomeSearch({ className }) {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [budget, setBudget] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [budgetError, setBudgetError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();

    const trimmedBudget = budget.trim();
    if (trimmedBudget) {
      const value = Number(trimmedBudget);
      if (Number.isNaN(value) || value <= 0) {
        setBudgetError("Enter a budget greater than zero.");
        return;
      }
      params.set("max_price", String(value));
    }
    setBudgetError("");

    if (brand.trim()) params.set("brand", brand.trim());
    if (fuelType) params.set("fuel_type", fuelType);
    if (vehicleType) params.set("vehicle_type", vehicleType);

    const qs = params.toString();
    router.push(qs ? `/vehicles?${qs}` : "/vehicles");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "grid gap-4 rounded-xl border border-border bg-card p-4 shadow-[0_18px_40px_-32px_rgba(36,39,32,0.45)] sm:grid-cols-2 sm:p-5 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end",
        className
      )}
      aria-label="Quick vehicle search"
    >
      <div className="grid gap-2">
        <Label htmlFor="home-brand">Brand</Label>
        <Input
          id="home-brand"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          placeholder="Any brand"
          autoComplete="off"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="home-budget">Max budget (₹)</Label>
        <Input
          id="home-budget"
          type="number"
          inputMode="numeric"
          min="0"
          step="10000"
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
          placeholder="e.g. 1500000"
          aria-invalid={budgetError ? true : undefined}
          aria-describedby={budgetError ? "home-budget-error" : undefined}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="home-fuel">Fuel type</Label>
        <FieldSelect
          id="home-fuel"
          value={fuelType}
          onChange={setFuelType}
          options={FUEL_TYPES}
          anyLabel="Any fuel"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="home-type">Vehicle type</Label>
        <FieldSelect
          id="home-type"
          value={vehicleType}
          onChange={setVehicleType}
          options={VEHICLE_TYPES}
          anyLabel="Any type"
        />
      </div>
      <Button type="submit" className="h-10 sm:col-span-2 lg:col-span-1">
        <Search data-icon="inline-start" aria-hidden="true" />
        Search
      </Button>
      {budgetError ? (
        <p
          id="home-budget-error"
          className="text-sm text-destructive sm:col-span-2 lg:col-span-5"
          role="alert"
        >
          {budgetError}
        </p>
      ) : null}
    </form>
  );
}
