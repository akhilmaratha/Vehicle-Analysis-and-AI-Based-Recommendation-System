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

const PRIORITY_OPTIONS = ["price", "mileage", "safety", "performance", "comfort"];

function emptyForm() {
  return {
    budget_min: "",
    budget_max: "",
    vehicle_type: "",
    fuel_type: "",
    transmission: "",
    seating_capacity: "",
    preferred_mileage: "",
    preferred_safety_rating: "",
    priorities: [],
  };
}

function prefsToForm(preferences) {
  if (!preferences) return emptyForm();
  return {
    budget_min: preferences.budget_min ?? "",
    budget_max: preferences.budget_max ?? "",
    vehicle_type: preferences.vehicle_type ?? "",
    fuel_type: preferences.fuel_type ?? "",
    transmission: preferences.transmission ?? "",
    seating_capacity: preferences.seating_capacity ?? "",
    preferred_mileage: preferences.preferred_mileage ?? "",
    preferred_safety_rating: preferences.preferred_safety_rating ?? "",
    priorities: Array.isArray(preferences.priorities)
      ? [...preferences.priorities]
      : [],
  };
}

function formToPayload(form) {
  const payload = {};
  const num = (v) => {
    if (v === "" || v == null) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  };

  const budgetMin = num(form.budget_min);
  const budgetMax = num(form.budget_max);
  if (budgetMin != null) payload.budget_min = budgetMin;
  if (budgetMax != null) payload.budget_max = budgetMax;
  if (form.vehicle_type) payload.vehicle_type = form.vehicle_type;
  if (form.fuel_type) payload.fuel_type = form.fuel_type;
  if (form.transmission) payload.transmission = form.transmission;
  const seats = num(form.seating_capacity);
  if (seats != null) payload.seating_capacity = seats;
  const mileage = num(form.preferred_mileage);
  if (mileage != null) payload.preferred_mileage = mileage;
  const safety = num(form.preferred_safety_rating);
  if (safety != null) payload.preferred_safety_rating = safety;
  payload.priorities = Array.isArray(form.priorities) ? form.priorities : [];
  return payload;
}

export function ExtractedPreferencesEditor({
  preferences,
  clarificationQuestions = [],
  onConfirm,
  onCancel,
  disabled = false,
}) {
  const [form, setForm] = useState(() => prefsToForm(preferences));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setForm(prefsToForm(preferences));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [preferences]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePriority(name) {
    setForm((prev) => {
      const set = new Set(prev.priorities || []);
      if (set.has(name)) set.delete(name);
      else set.add(name);
      return { ...prev, priorities: [...set] };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm?.(formToPayload(form));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm preferences</CardTitle>
        <CardDescription>
          Review and edit the extracted preferences, then run recommendations.
        </CardDescription>
      </CardHeader>
      {clarificationQuestions.length > 0 ? (
        <CardContent className="space-y-2 border-b pb-4">
          <p className="text-sm font-medium">Clarification needed</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {clarificationQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </CardContent>
      ) : null}
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-budget-min">Budget min (₹)</Label>
            <Input
              id="edit-budget-min"
              type="number"
              value={form.budget_min}
              onChange={(e) => updateField("budget_min", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-budget-max">Budget max (₹)</Label>
            <Input
              id="edit-budget-max"
              type="number"
              value={form.budget_max}
              onChange={(e) => updateField("budget_max", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-vehicle-type">Vehicle type</Label>
            <select
              id="edit-vehicle-type"
              className={selectClassName}
              value={form.vehicle_type}
              onChange={(e) => updateField("vehicle_type", e.target.value)}
              disabled={disabled}
            >
              <option value="">Any</option>
              <option>Hatchback</option>
              <option>Sedan</option>
              <option>SUV</option>
              <option>MUV</option>
              <option>Coupe</option>
              <option>Other</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-fuel-type">Fuel type</Label>
            <select
              id="edit-fuel-type"
              className={selectClassName}
              value={form.fuel_type}
              onChange={(e) => updateField("fuel_type", e.target.value)}
              disabled={disabled}
            >
              <option value="">Any</option>
              <option>Petrol</option>
              <option>Diesel</option>
              <option>CNG</option>
              <option>Electric</option>
              <option>Hybrid</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-transmission">Transmission</Label>
            <select
              id="edit-transmission"
              className={selectClassName}
              value={form.transmission}
              onChange={(e) => updateField("transmission", e.target.value)}
              disabled={disabled}
            >
              <option value="">Any</option>
              <option>Manual</option>
              <option>Automatic</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-seating">Min seating</Label>
            <Input
              id="edit-seating"
              type="number"
              value={form.seating_capacity}
              onChange={(e) => updateField("seating_capacity", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-mileage">Preferred mileage</Label>
            <Input
              id="edit-mileage"
              type="number"
              value={form.preferred_mileage}
              onChange={(e) => updateField("preferred_mileage", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-safety">Preferred safety (0–5)</Label>
            <Input
              id="edit-safety"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.preferred_safety_rating}
              onChange={(e) =>
                updateField("preferred_safety_rating", e.target.value)
              }
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Priorities</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((name) => {
                const active = (form.priorities || []).includes(name);
                return (
                  <Button
                    key={name}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => togglePriority(name)}
                    disabled={disabled}
                  >
                    {name}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={disabled}>
            Get recommendations
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={disabled}
            >
              Cancel
            </Button>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  );
}

export { formToPayload, prefsToForm };
