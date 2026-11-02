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

  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} Lakh`;
  }

  return formatINR(value);
}
