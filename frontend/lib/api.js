import {
  cachedFetch,
  invalidateVehiclesCache,
  peekVehicleDetail,
  peekVehiclesList,
  writeVehicleDetail,
  writeVehiclesList,
} from "@/lib/vehicles-cache";
import { parseVehicleIdFromSlug } from "@/lib/vehicle-slug";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Format FastAPI / generic error payloads into a readable message.
 * @param {unknown} data
 * @param {number} status
 */
function formatValidationList(items) {
  return items
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const loc = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== "body" && part !== "query").join(".")
          : "";
        const msg = item.msg || item.message || "Validation error";
        return loc ? `${loc}: ${msg}` : msg;
      }
      return null;
    })
    .filter(Boolean)
    .join("; ");
}

function formatErrorMessage(data, status) {
  if (status === 401) {
    const msg =
      data && typeof data === "object" && typeof data.message === "string"
        ? data.message.trim()
        : "";
    return msg || "Admin session expired or invalid. Please sign in again.";
  }
  if (status === 403) {
    return (
      (data && typeof data === "object" && data.message) ||
      "You do not have permission to perform this action."
    );
  }
  if (status === 413) {
    return "Upload or request is too large.";
  }
  if (status === 429) {
    return (
      (data && typeof data === "object" && data.message) ||
      "AI service rate limit reached. Please try again shortly."
    );
  }
  if (status === 504) {
    return (
      (data && typeof data === "object" && data.message) ||
      "AI service timed out. Please try again."
    );
  }
  if (status === 503) {
    return (
      (data && typeof data === "object" && data.message) ||
      "Service temporarily unavailable. Check that the API and database are running."
    );
  }

  if (data == null || data === "") {
    return `Request failed with status ${status}`;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object") {
    const detail = data.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      return formatValidationList(detail);
    }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return formatValidationList(data.errors);
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  }

  return `Request failed with status ${status}`;
}

/**
 * Build a query string from a plain object. Skips null/undefined/empty-string values.
 * @param {Record<string, unknown> | null | undefined} params
 */
function buildQueryString(params) {
  if (!params || typeof params !== "object") {
    return "";
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Central fetch helper for the backend API.
 * Supports GET, POST, PUT, PATCH, DELETE. JSON in/out. Handles 204, HTTP errors, network failures.
 *
 * @param {string} path - API path beginning with /
 * @param {{
 *   method?: string,
 *   body?: unknown,
 *   headers?: Record<string, string>,
 *   signal?: AbortSignal,
 * }} [options]
 */
async function request(path, options = {}) {
  const { method = "GET", body, headers = {}, signal, ...rest } = options;
  const url = `${API_URL}${path}`;

  const init = {
    method,
    headers: { ...headers },
    signal,
    credentials: "include",
    ...rest,
  };

  if (body !== undefined && body !== null) {
    init.headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    const reason = error?.message ? `: ${error.message}` : "";
    throw new Error(
      `Unable to reach the API at ${API_URL}. Check that the backend is running${reason}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error = new Error(formatErrorMessage(data, response.status));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/** GET /api/health */
export function getHealth(options = {}) {
  return request("/api/health", { method: "GET", ...options });
}

/**
 * GET /api/vehicles — paginated list.
 * Returns `{ items, total, page, limit, pages }`.
 *
 * Supported params (match backend query):
 * page, limit, brand, fuel_type, transmission, vehicle_type,
 * min_price, max_price, min_mileage, max_mileage, seating_capacity,
 * sort_by, sort_order
 *
 * @param {Record<string, unknown>} [params]
 * @param {{ signal?: AbortSignal, force?: boolean, bypassCache?: boolean }} [options]
 */
export function getVehicles(params = {}, options = {}) {
  const { force = false, bypassCache = false, ...requestOptions } = options;
  const query = buildQueryString(params);

  if (bypassCache) {
    return request(`/api/vehicles${query}`, {
      method: "GET",
      ...requestOptions,
    });
  }

  return cachedFetch(
    `vehicles:list:${query || "default"}`,
    () =>
      request(`/api/vehicles${query}`, {
        method: "GET",
        ...requestOptions,
      }),
    {
      force,
      peek: () => peekVehiclesList(params),
      write: (data) => writeVehiclesList(params, data),
    }
  );
}

/**
 * GET /api/vehicles/{id|slug}
 * @param {number|string} idOrSlug
 * @param {{ signal?: AbortSignal, force?: boolean, bypassCache?: boolean }} [options]
 */
export function getVehicleById(idOrSlug, options = {}) {
  const { force = false, bypassCache = false, ...requestOptions } = options;
  const ref = encodeURIComponent(String(idOrSlug));
  const numericId = parseVehicleIdFromSlug(idOrSlug);

  if (bypassCache) {
    return request(`/api/vehicles/${ref}`, {
      method: "GET",
      ...requestOptions,
    });
  }

  return cachedFetch(
    `vehicles:detail:${idOrSlug}`,
    () =>
      request(`/api/vehicles/${ref}`, {
        method: "GET",
        ...requestOptions,
      }),
    {
      force,
      peek: () => (numericId != null ? peekVehicleDetail(numericId) : null),
      write: (data) => {
        if (data?.id != null) writeVehicleDetail(data.id, data);
      },
    }
  );
}

/** POST /api/admin/vehicles */
export async function createVehicle(data, options = {}) {
  const created = await request("/api/admin/vehicles", {
    method: "POST",
    body: data,
    ...options,
  });
  invalidateVehiclesCache();
  return created;
}

/** PUT /api/admin/vehicles/{id} */
export async function updateVehicle(id, data, options = {}) {
  const updated = await request(`/api/admin/vehicles/${id}`, {
    method: "PUT",
    body: data,
    ...options,
  });
  invalidateVehiclesCache();
  return updated;
}

/** DELETE /api/admin/vehicles/{id} — returns null on 204 */
export async function deleteVehicle(id, options = {}) {
  const result = await request(`/api/admin/vehicles/${id}`, {
    method: "DELETE",
    ...options,
  });
  invalidateVehiclesCache();
  return result;
}

export function adminLogin(credentials, options = {}) {
  return request("/api/admin/auth/login", {
    method: "POST",
    body: credentials,
    ...options,
  });
}

export function adminLogout(options = {}) {
  return request("/api/admin/auth/logout", {
    method: "POST",
    ...options,
  });
}

export function getCurrentAdmin(options = {}) {
  return request("/api/admin/auth/me", { method: "GET", ...options });
}

export function getAdminDashboardStats(options = {}) {
  return request("/api/admin/dashboard/stats", { method: "GET", ...options });
}

export function getAdminVehicles(params = {}, options = {}) {
  const query = buildQueryString(params);
  return request(`/api/admin/vehicles${query}`, { method: "GET", ...options });
}

export function getAdminVehicleById(id, options = {}) {
  return request(`/api/admin/vehicles/${id}`, { method: "GET", ...options });
}

/**
 * POST /api/recommendations
 * Payload: budget, fuel_type, transmission, vehicle_type,
 * minimum_mileage, seating_capacity, priorities
 */
export function getRecommendations(payload, options = {}) {
  return request("/api/recommendations", {
    method: "POST",
    body: payload,
    ...options,
  });
}

/**
 * POST /api/ai/extract-preferences
 * @param {{ message: string, previous_preferences?: object }} payload
 */
export function extractPreferences(payload, options = {}) {
  return request("/api/ai/extract-preferences", {
    method: "POST",
    body: payload,
    ...options,
  });
}

/**
 * POST /api/ai/recommendations
 * NL / follow-up / confirmed preferences → ranked results + explanations
 * @param {{
 *   message?: string,
 *   preferences?: object,
 *   previous_preferences?: object,
 *   generate_explanations?: boolean,
 * }} payload
 */
export function getAiRecommendations(payload, options = {}) {
  return request("/api/ai/recommendations", {
    method: "POST",
    body: payload,
    ...options,
  });
}

/**
 * POST /api/ai/explain
 * @param {{
 *   preferences: object,
 *   recommendations?: object[],
 *   alternatives?: object[],
 * }} payload
 */
export function explainRecommendations(payload, options = {}) {
  return request("/api/ai/explain", {
    method: "POST",
    body: payload,
    ...options,
  });
}

export { API_URL, request, buildQueryString };
