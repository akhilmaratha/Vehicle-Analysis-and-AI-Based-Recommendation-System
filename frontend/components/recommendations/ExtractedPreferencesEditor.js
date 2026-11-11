"use client";

import { useEffect, useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { FieldSelect } from "@/components/forms/FieldSelect";
import { ChoiceChips } from "@/components/forms/ChoiceChips";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_TYPES } from "@/lib/vehicle-options";

const PRIORITY_OPTIONS = [
  { value: "price", label: "Price" },
  { value: "mileage", label: "Mileage" },
  { value: "safety", label: "Safety" },
  { value: "performance", label: "Performance" },
  { value: "comfort", label: "Comfort" },
];

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

function validateForm(form) {
  const errors = {};
  const min = form.budget_min === "" ? null : Number(form.budget_min);
  const max = form.budget_max === "" ? null : Number(form.budget_max);
  if (min != null && (Number.isNaN(min) || min < 0)) errors.budget_min = "Enter a positive amount.";
  if (max != null && (Number.isNaN(max) || max <= 0)) errors.budget_max = "Enter an amount above zero.";
  if (min != null && max != null && !errors.budget_min && !errors.budget_max && min > max) {
    errors.budget_max = "Maximum should be at least the minimum.";
  }
  const safety = form.preferred_safety_rating === "" ? null : Number(form.preferred_safety_rating);
  if (safety != null && (Number.isNaN(safety) || safety < 0 || safety > 5)) {
    errors.preferred_safety_rating = "Use a rating between 0 and 5.";
  }
  const seats = form.seating_capacity === "" ? null : Number(form.seating_capacity);
  if (seats != null && (!Number.isInteger(seats) || seats < 1)) {
    errors.seating_capacity = "Use a whole number of seats.";
  }
  return errors;
}

function NumberField({ id, label, value, onChange, error, disabled, hint, ...props }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <fieldset className="grid gap-4 border-t border-border pt-6 first:border-0 first:pt-0 md:grid-cols-[160px_minmax(0,1fr)] md:gap-8">
      <legend className="sr-only">{title}</legend>
      <p className="font-heading text-sm font-bold" aria-hidden="true">
        {title}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export function ExtractedPreferencesEditor({
  preferences,
  clarificationQuestions = [],
  statusMessage,
  onConfirm,
  onCancel,
  disabled = false,
}) {
  const [form, setForm] = useState(() => prefsToForm(preferences));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setForm(prefsToForm(preferences));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [preferences]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    const hasErrors = Object.values(nextErrors).some(Boolean);
    setErrors(nextErrors);
    if (hasErrors) return;
    onConfirm?.(formToPayload(form));
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card" noValidate>
      <div className="space-y-1.5 border-b border-border p-5 sm:px-7 sm:py-6">
        <h2 className="font-heading text-lg font-bold">Is this right?</h2>
        <p className="text-sm text-muted-foreground">
          {statusMessage ||
            "Here is what we understood. Adjust anything that is off, then we will rank vehicles for you."}
        </p>
      </div>

      {clarificationQuestions.length > 0 ? (
        <div className="mx-5 mt-5 flex gap-3 rounded-lg bg-sage px-4 py-3.5 sm:mx-7">
          <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-primary">A few details would help</p>
            <ul className="space-y-1 text-sm text-foreground/80">
              {clarificationQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="space-y-6 p-5 sm:p-7">
        <Section title="Budget">
          <NumberField
            id="edit-budget-min"
            label="Minimum (₹)"
            value={form.budget_min}
            onChange={(v) => updateField("budget_min", v)}
            error={errors.budget_min}
            disabled={disabled}
            min="0"
            step="10000"
            placeholder="No minimum"
          />
          <NumberField
            id="edit-budget-max"
            label="Maximum (₹)"
            value={form.budget_max}
            onChange={(v) => updateField("budget_max", v)}
            error={errors.budget_max}
            disabled={disabled}
            min="0"
            step="10000"
            placeholder="No maximum"
          />
        </Section>

        <Section title="Vehicle">
          <div className="grid gap-2">
            <Label htmlFor="edit-vehicle-type">Vehicle type</Label>
            <FieldSelect
              id="edit-vehicle-type"
              value={form.vehicle_type}
              onChange={(v) => updateField("vehicle_type", v)}
              options={VEHICLE_TYPES}
              anyLabel="Any type"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-fuel-type">Fuel type</Label>
            <FieldSelect
              id="edit-fuel-type"
              value={form.fuel_type}
              onChange={(v) => updateField("fuel_type", v)}
              options={FUEL_TYPES}
              anyLabel="Any fuel"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-transmission">Transmission</Label>
            <FieldSelect
              id="edit-transmission"
              value={form.transmission}
              onChange={(v) => updateField("transmission", v)}
              options={TRANSMISSIONS}
              anyLabel="Either"
              disabled={disabled}
            />
          </div>
        </Section>

        <Section title="Everyday needs">
          <NumberField
            id="edit-seating"
            label="Minimum seats"
            value={form.seating_capacity}
            onChange={(v) => updateField("seating_capacity", v)}
            error={errors.seating_capacity}
            disabled={disabled}
            min="1"
            step="1"
            placeholder="Any"
          />
          <NumberField
            id="edit-mileage"
            label="Preferred mileage"
            value={form.preferred_mileage}
            onChange={(v) => updateField("preferred_mileage", v)}
            disabled={disabled}
            min="0"
            step="0.5"
            placeholder="km/l"
          />
          <NumberField
            id="edit-safety"
            label="Preferred safety (0–5)"
            value={form.preferred_safety_rating}
            onChange={(v) => updateField("preferred_safety_rating", v)}
            error={errors.preferred_safety_rating}
            disabled={disabled}
            min="0"
            max="5"
            step="0.5"
            placeholder="Any"
          />
        </Section>

        <fieldset className="grid gap-4 border-t border-border pt-6 md:grid-cols-[160px_minmax(0,1fr)] md:gap-8">
          <legend className="sr-only">Priorities</legend>
          <div aria-hidden="true">
            <p className="font-heading text-sm font-bold">Priorities</p>
            <p className="mt-1 text-xs text-muted-foreground">What matters most</p>
          </div>
          <ChoiceChips
            label="Priorities"
            multiple
            options={PRIORITY_OPTIONS}
            value={form.priorities}
            onChange={(next) => updateField("priorities", next)}
            disabled={disabled}
          />
        </fieldset>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border bg-secondary/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
            Back to description
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={disabled}>
          Show recommendations
        </Button>
      </div>
    </form>
  );
}

export { formToPayload, prefsToForm };
