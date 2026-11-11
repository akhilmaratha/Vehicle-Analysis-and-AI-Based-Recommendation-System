/**
 * Public vehicle detail URL helpers.
 * Slug shape: brand-model-variant-id (id always last for reliable lookup).
 */

const SLUG_RE = /[^a-z0-9]+/g;
const TRAILING_ID_RE = /^(.+)-(\d+)$/;

export function slugifySegment(value) {
  if (value == null || value === "") return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(SLUG_RE, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @param {{ brand?: string|null, model?: string|null, variant?: string|null, id?: number|string|null, slug?: string|null }} vehicle
 */
export function vehicleSlug(vehicle) {
  if (!vehicle) return "";
  if (typeof vehicle.slug === "string" && vehicle.slug.trim()) {
    return vehicle.slug.trim();
  }
  const parts = [
    slugifySegment(vehicle.brand),
    slugifySegment(vehicle.model),
    slugifySegment(vehicle.variant),
  ].filter(Boolean);
  const body = parts.join("-") || "vehicle";
  const id = Number(vehicle.id);
  if (Number.isInteger(id) && id >= 1) {
    return `${body}-${id}`;
  }
  return body;
}

/** @param {{ brand?: string|null, model?: string|null, variant?: string|null, id?: number|string|null, slug?: string|null }} vehicle */
export function vehicleHref(vehicle) {
  const slug = vehicleSlug(vehicle);
  return slug ? `/vehicles/${slug}` : "/vehicles";
}

/**
 * Resolve a numeric id from `/vehicles/[slug]` (supports legacy `/vehicles/12`).
 * @param {string | string[] | null | undefined} raw
 * @returns {number | null}
 */
export function parseVehicleIdFromSlug(raw) {
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (text == null || text === "") return null;
  const value = String(text).trim();
  if (/^\d+$/.test(value)) {
    const id = Number(value);
    return Number.isInteger(id) && id >= 1 ? id : null;
  }
  const match = value.match(TRAILING_ID_RE);
  if (!match) return null;
  const id = Number(match[2]);
  return Number.isInteger(id) && id >= 1 ? id : null;
}
