/**
 * Format a number as Indian Rupees (INR).
 * @param {number | string | null | undefined} price
 * @returns {string}
 */
export function formatINR(price) {
  if (price == null || price === "") return "—";
  const value = Number(price);
  if (Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Compact price label (e.g. ₹14.50 Lakh) for card summaries.
 * @param {number | string | null | undefined} price
 * @returns {string}
 */
export function formatPrice(price) {
  if (price == null || price === "") return "—";
  const value = Number(price);
  if (Number.isNaN(value)) return "—";

  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Crore`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} Lakh`;
  }

  return formatINR(value);
}

/**
 * Mileage with the correct unit for the fuel type, or null when missing.
 * @param {{ mileage?: number | null, fuel_type?: string | null }} vehicle
 */
export function formatMileage(vehicle) {
  if (!vehicle || vehicle.mileage == null || vehicle.mileage === "") return null;
  const unit = vehicle.fuel_type === "Electric" ? "km/charge" : "km/l";
  return `${vehicle.mileage} ${unit}`;
}

/**
 * Score in [0, 1] as a whole-number percentage label.
 * @param {number | null | undefined} score
 */
export function formatScore(score) {
  if (score == null || Number.isNaN(Number(score))) return "—";
  return `${Math.round(Number(score) * 100)}%`;
}

/** "Brand Model" with graceful fallback. */
export function vehicleTitle(vehicle, fallback = "Vehicle") {
  if (!vehicle) return fallback;
  return [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || fallback;
}
