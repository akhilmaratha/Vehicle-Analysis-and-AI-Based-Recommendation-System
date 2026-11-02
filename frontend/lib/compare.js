/**
 * Lightweight compare shortlist (localStorage).
 * Phase 6 will own the full compare UI; this only stores up to 3 vehicle IDs.
 */

const STORAGE_KEY = "vehicleai_compare_ids";
export const MAX_COMPARE = 3;

function normalizeId(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/**
 * @returns {number[]}
 */
export function getCompareIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeId)
      .filter((id) => id != null)
      .slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

function persist(ids) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("vehicleai:compare-change"));
}

/**
 * @param {number|string} id
 * @returns {{ ok: boolean, ids: number[], reason?: string }}
 */
export function addToCompare(id) {
  const vehicleId = normalizeId(id);
  if (vehicleId == null) {
    return { ok: false, ids: getCompareIds(), reason: "Invalid vehicle id." };
  }

  const current = getCompareIds();
  if (current.includes(vehicleId)) {
    return { ok: true, ids: current, reason: "Already in compare list." };
  }
  if (current.length >= MAX_COMPARE) {
    return {
      ok: false,
      ids: current,
      reason: `You can compare up to ${MAX_COMPARE} vehicles.`,
    };
  }

  const next = [...current, vehicleId];
  persist(next);
  return { ok: true, ids: next };
}

/**
 * @param {number|string} id
 * @returns {number[]}
 */
export function removeFromCompare(id) {
  const vehicleId = normalizeId(id);
  const next = getCompareIds().filter((item) => item !== vehicleId);
  persist(next);
  return next;
}

/**
 * @param {number|string} id
 */
export function isInCompare(id) {
  const vehicleId = normalizeId(id);
  if (vehicleId == null) return false;
  return getCompareIds().includes(vehicleId);
}

/**
 * Query-string helper for deep-linking compare selections later.
 * @param {number[]} [ids]
 */
export function compareIdsToQuery(ids = getCompareIds()) {
  if (!ids.length) return "";
  return `ids=${ids.join(",")}`;
}
