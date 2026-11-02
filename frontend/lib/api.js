const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Format FastAPI / generic error payloads into a readable message.
 * @param {unknown} data
 * @param {number} status
 */
function formatErrorMessage(data, status) {
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
      return detail
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
 */
export function getVehicles(params = {}, options = {}) {
  const query = buildQueryString(params);
  return request(`/api/vehicles${query}`, { method: "GET", ...options });
}

/** GET /api/vehicles/{id} */
export function getVehicleById(id, options = {}) {
  return request(`/api/vehicles/${id}`, { method: "GET", ...options });
}

/** POST /api/vehicles */
export function createVehicle(data, options = {}) {
  return request("/api/vehicles", {
    method: "POST",
    body: data,
    ...options,
  });
}

/** PUT /api/vehicles/{id} */
export function updateVehicle(id, data, options = {}) {
  return request(`/api/vehicles/${id}`, {
    method: "PUT",
    body: data,
    ...options,
  });
}

/** DELETE /api/vehicles/{id} — returns null on 204 */
export function deleteVehicle(id, options = {}) {
  return request(`/api/vehicles/${id}`, {
    method: "DELETE",
    ...options,
  });
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

export { API_URL, request, buildQueryString };
