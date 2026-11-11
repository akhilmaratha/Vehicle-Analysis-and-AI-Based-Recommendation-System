/**
 * In-memory cache for public vehicle list/detail fetches.
 * Survives client navigations within the SPA session so Explore → Detail → Explore
 * can paint immediately without a cold API round-trip.
 */

const LIST_TTL_MS = 60_000;
const DETAIL_TTL_MS = 5 * 60_000;

/** @type {Map<string, { data: any, ts: number }>} */
const listCache = new Map();
/** @type {Map<string, { data: any, ts: number }>} */
const detailCache = new Map();
/** @type {Map<string, Promise<any>>} */
const inflight = new Map();

function isFresh(entry, ttlMs) {
  return Boolean(entry) && Date.now() - entry.ts < ttlMs;
}

export function vehiclesListCacheKey(params = {}) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)])
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([key, value]) => `${key}=${value}`).join("&") || "default";
}

export function peekVehiclesList(params) {
  const entry = listCache.get(vehiclesListCacheKey(params));
  if (!entry) return null;
  return {
    data: entry.data,
    fresh: isFresh(entry, LIST_TTL_MS),
    ageMs: Date.now() - entry.ts,
  };
}

export function peekVehicleDetail(id) {
  if (id == null) return null;
  const entry = detailCache.get(String(id));
  if (!entry) return null;
  return {
    data: entry.data,
    fresh: isFresh(entry, DETAIL_TTL_MS),
    ageMs: Date.now() - entry.ts,
  };
}

export function writeVehiclesList(params, data) {
  listCache.set(vehiclesListCacheKey(params), { data, ts: Date.now() });
  const items = Array.isArray(data?.items) ? data.items : [];
  for (const item of items) {
    if (item?.id != null) writeVehicleDetail(item.id, item);
  }
}

export function writeVehicleDetail(id, data) {
  if (id == null || data == null) return;
  detailCache.set(String(id), { data, ts: Date.now() });
}

export function invalidateVehiclesCache() {
  listCache.clear();
  detailCache.clear();
  inflight.clear();
}

/**
 * Deduped GET with optional cache.
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fetcher
 * @param {{
 *   peek?: () => { data: T, fresh: boolean } | null,
 *   write?: (data: T) => void,
 *   force?: boolean,
 * }} [options]
 * @returns {Promise<T>}
 */
export async function cachedFetch(key, fetcher, options = {}) {
  const { peek, write, force = false } = options;
  const hit = peek?.() || null;

  if (!force && hit?.fresh) {
    return hit.data;
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = fetcher()
    .then((data) => {
      write?.(data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
