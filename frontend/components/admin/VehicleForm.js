"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"];
const TRANSMISSIONS = ["Manual", "Automatic"];
const VEHICLE_TYPES = ["Hatchback", "Sedan", "SUV", "MUV", "Coupe", "Other"];

const emptyVehicle = {
  brand: "",
  model: "",
  variant: "",
  price: "",
  fuel_type: "Petrol",
  transmission: "Manual",
  vehicle_type: "Hatchback",
  mileage: "",
  engine: "",
  power: "",
  torque: "",
  seating_capacity: "",
  boot_space: "",
  safety_rating: "",
  description: "",
  image_url: "",
};

const formFields = Object.keys(emptyVehicle);

export function VehicleForm({ initialVehicle = null, submitLabel = "Save Vehicle", onSubmit }) {
  const initial = useMemo(
    () => ({ ...emptyVehicle, ...(initialVehicle || {}) }),
    [initialVehicle]
  );
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function buildPayload() {
    const payload = {};
    for (const field of formFields) {
      payload[field] = form[field];
    }
    for (const key of ["price", "mileage", "boot_space", "safety_rating"]) {
      payload[key] = payload[key] === "" || payload[key] == null ? null : Number(payload[key]);
    }
    payload.seating_capacity =
      payload.seating_capacity === "" || payload.seating_capacity == null
        ? null
        : Number(payload.seating_capacity);
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === "string") payload[key] = value.trim();
      if (payload[key] === "") payload[key] = null;
    }
    return payload;
  }

  function validate(payload) {
    if (!payload.brand || !payload.model) return "Brand and model are required.";
    if (!payload.price || payload.price <= 0) return "Price must be greater than 0.";
    if (payload.mileage != null && payload.mileage < 0) return "Mileage cannot be negative.";
    if (payload.boot_space != null && payload.boot_space < 0) return "Boot space cannot be negative.";
    if (payload.seating_capacity != null && payload.seating_capacity < 1) {
      return "Seating capacity must be at least 1.";
    }
    if (payload.safety_rating != null && (payload.safety_rating < 0 || payload.safety_rating > 5)) {
      return "Safety rating must be between 0 and 5.";
    }
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = buildPayload();
    const validationError = validate(payload);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err?.message || "Unable to save vehicle");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Brand" name="brand" value={form.brand} onChange={updateField} required />
            <TextField label="Model" name="model" value={form.model} onChange={updateField} required />
            <TextField label="Variant" name="variant" value={form.variant || ""} onChange={updateField} />
            <TextField label="Price" name="price" type="number" value={form.price} onChange={updateField} required />
            <SelectField label="Fuel Type" name="fuel_type" value={form.fuel_type} options={FUEL_TYPES} onChange={updateField} />
            <SelectField label="Transmission" name="transmission" value={form.transmission} options={TRANSMISSIONS} onChange={updateField} />
            <SelectField label="Vehicle Type" name="vehicle_type" value={form.vehicle_type} options={VEHICLE_TYPES} onChange={updateField} />
            <TextField label="Mileage" name="mileage" type="number" value={form.mileage || ""} onChange={updateField} />
            <TextField label="Engine" name="engine" value={form.engine || ""} onChange={updateField} />
            <TextField label="Power" name="power" value={form.power || ""} onChange={updateField} />
            <TextField label="Torque" name="torque" value={form.torque || ""} onChange={updateField} />
            <TextField label="Seating Capacity" name="seating_capacity" type="number" value={form.seating_capacity || ""} onChange={updateField} />
            <TextField label="Boot Space" name="boot_space" type="number" value={form.boot_space || ""} onChange={updateField} />
            <TextField label="Safety Rating" name="safety_rating" type="number" step="0.1" value={form.safety_rating || ""} onChange={updateField} />
            <TextField label="Image URL" name="image_url" value={form.image_url || ""} onChange={updateField} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={form.description || ""}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </div>
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TextField({ label, name, value, onChange, ...props }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        {...props}
      />
    </div>
  );
}

function SelectField({ label, name, value, options, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
