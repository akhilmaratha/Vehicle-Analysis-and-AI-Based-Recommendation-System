"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { FieldSelect } from "@/components/forms/FieldSelect";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_TYPES } from "@/lib/vehicle-options";
import { formatINR } from "@/lib/format";

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

function isLikelyUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function VehicleForm({ initialVehicle = null, submitLabel = "Save Vehicle", onSubmit, cancelHref = "/admin/vehicles" }) {
  const initial = useMemo(
    () => ({ ...emptyVehicle, ...(initialVehicle || {}) }),
    [initialVehicle]
  );
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const imageUrl = (form.image_url || "").trim();
  const validImageUrl = isLikelyUrl(imageUrl) ? imageUrl : "";
  const [previewUrl, setPreviewUrl] = useState(validImageUrl);
  const [imageStatus, setImageStatus] = useState("loading");

  useEffect(() => {
    if (validImageUrl === previewUrl) return undefined;
    const timer = window.setTimeout(() => {
      setPreviewUrl(validImageUrl);
      setImageStatus("loading");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [validImageUrl, previewUrl]);

  const displayStatus = !imageUrl
    ? "empty"
    : !validImageUrl
      ? "invalid"
      : validImageUrl !== previewUrl
        ? "loading"
        : imageStatus;

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

  const priceNumber = Number(form.price);
  const pricePreview =
    form.price !== "" && !Number.isNaN(priceNumber) && priceNumber > 0 ? formatINR(priceNumber) : null;

  return (
    <form className="space-y-6 pb-4" onSubmit={handleSubmit}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <FormSection title="Basics" description="How the vehicle appears in listings.">
            <TextField label="Brand" name="brand" value={form.brand} onChange={updateField} required />
            <TextField label="Model" name="model" value={form.model} onChange={updateField} required />
            <TextField label="Variant" name="variant" value={form.variant ?? ""} onChange={updateField} />
            <TextField
              label="Price (₹)"
              name="price"
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              value={form.price ?? ""}
              onChange={updateField}
              required
              hint={pricePreview}
            />
            <SelectField label="Vehicle type" name="vehicle_type" value={form.vehicle_type} options={VEHICLE_TYPES} onChange={updateField} />
          </FormSection>

          <FormSection title="Powertrain" description="Engine and efficiency details.">
            <SelectField label="Fuel type" name="fuel_type" value={form.fuel_type} options={FUEL_TYPES} onChange={updateField} />
            <SelectField label="Transmission" name="transmission" value={form.transmission} options={TRANSMISSIONS} onChange={updateField} />
            <TextField
              label={form.fuel_type === "Electric" ? "Range (km/charge)" : "Mileage (km/l)"}
              name="mileage"
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={form.mileage ?? ""}
              onChange={updateField}
            />
            <TextField label="Engine" name="engine" placeholder="e.g. 1.5L Turbo" value={form.engine ?? ""} onChange={updateField} />
            <TextField label="Power" name="power" placeholder="e.g. 115 PS" value={form.power ?? ""} onChange={updateField} />
            <TextField label="Torque" name="torque" placeholder="e.g. 144 Nm" value={form.torque ?? ""} onChange={updateField} />
          </FormSection>

          <FormSection title="Practicality and safety">
            <TextField
              label="Seating capacity"
              name="seating_capacity"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={form.seating_capacity ?? ""}
              onChange={updateField}
            />
            <TextField
              label="Boot space (L)"
              name="boot_space"
              type="number"
              min="0"
              inputMode="numeric"
              value={form.boot_space ?? ""}
              onChange={updateField}
            />
            <TextField
              label="Safety rating (0–5)"
              name="safety_rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              inputMode="decimal"
              value={form.safety_rating ?? ""}
              onChange={updateField}
            />
          </FormSection>

          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="description" className="font-heading text-base font-bold">
                Description
              </Label>
              <Textarea
                id="description"
                className="min-h-32"
                placeholder="A short, factual summary of the vehicle."
                value={form.description ?? ""}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div>
              <h2 className="font-heading text-base font-bold">Image</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste the image URL (for example from Cloudinary).
              </p>
            </div>
            <VehicleImage
              key={previewUrl || "empty"}
              src={previewUrl || null}
              alt="Vehicle image preview"
              aspect="card"
              className="rounded-lg border border-border"
              onStatusChange={setImageStatus}
            />
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                type="url"
                inputMode="url"
                placeholder="https://res.cloudinary.com/…"
                value={form.image_url ?? ""}
                onChange={(event) => updateField("image_url", event.target.value)}
                aria-describedby="image_url-status"
              />
              <ImageStatus status={displayStatus} />
            </div>
          </section>
        </aside>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-4 py-4 supports-backdrop-filter:backdrop-blur-md sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 lg:-mx-10 lg:px-10">
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href={cancelHref} />}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ImageStatus({ status }) {
  const content = {
    empty: { text: "No image yet. Listings will show a neutral placeholder.", tone: "muted" },
    loading: { text: "Checking image…", tone: "muted" },
    loaded: { text: "Image loaded successfully.", tone: "ok" },
    error: { text: "This URL did not load an image. Check the link before saving.", tone: "warn" },
    invalid: { text: "Enter a full URL starting with https://", tone: "warn" },
  }[status] || { text: "", tone: "muted" };

  return (
    <p
      id="image_url-status"
      className={
        content.tone === "warn"
          ? "flex items-start gap-1.5 text-xs text-destructive"
          : content.tone === "ok"
            ? "flex items-start gap-1.5 text-xs text-primary"
            : "text-xs text-muted-foreground"
      }
      aria-live="polite"
    >
      {content.tone === "warn" ? <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" /> : null}
      {content.tone === "ok" ? <CheckCircle2 className="mt-px size-3.5 shrink-0" aria-hidden="true" /> : null}
      {content.text}
    </p>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="font-heading text-base font-bold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({ label, name, value, onChange, hint, ...props }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {props.required ? <span className="text-destructive" aria-hidden="true"> *</span> : null}
      </Label>
      <Input
        id={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        aria-describedby={hint ? `${name}-hint` : undefined}
        {...props}
      />
      {hint ? (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground tabular">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({ label, name, value, options, onChange }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <FieldSelect
        id={name}
        value={value}
        options={options}
        onChange={(next) => onChange(name, next)}
      />
    </div>
  );
}
