"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  VehicleFilters,
  validateVehicleFilters,
} from "@/components/vehicles/VehicleFilters";
import { ActiveFilterChips } from "@/components/vehicles/ActiveFilterChips";
import {
  VehicleSort,
  parseSortValue,
  sortValueFromFilters,
} from "@/components/vehicles/VehicleSort";
import { VehiclePagination } from "@/components/vehicles/VehiclePagination";
import { VehicleGrid } from "@/components/vehicles/VehicleGrid";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { getVehicles } from "@/lib/api";

/** Backend-supported filter query keys (no model / free-text search). */
const FILTER_KEYS = [
  "brand",
  "fuel_type",
  "transmission",
  "vehicle_type",
  "min_price",
  "max_price",
  "min_mileage",
  "max_mileage",
  "seating_capacity",
];

const SORT_KEYS = ["sort_by", "sort_order"];

const ALLOWED_SORT_BY = new Set(["price", "mileage", "created_at"]);
const ALLOWED_SORT_ORDER = new Set(["asc", "desc"]);
const ALLOWED_FUEL = new Set([
  "Petrol",
  "Diesel",
  "CNG",
  "Electric",
  "Hybrid",
]);
const ALLOWED_TRANSMISSION = new Set(["Manual", "Automatic"]);
const ALLOWED_VEHICLE_TYPE = new Set([
  "Hatchback",
  "Sedan",
  "SUV",
  "MUV",
  "Coupe",
  "Other",
]);

const TEXT_FILTER_KEYS = new Set([
  "brand",
  "min_price",
  "max_price",
  "min_mileage",
  "max_mileage",
  "seating_capacity",
]);

const DEFAULT_LIMIT = 9;

const EMPTY_FILTERS = {
  brand: "",
  fuel_type: "",
  transmission: "",
  vehicle_type: "",
  min_price: "",
  max_price: "",
  min_mileage: "",
  max_mileage: "",
  seating_capacity: "",
  sort_by: "created_at",
  sort_order: "desc",
};

function sanitizeEnum(value, allowed) {
  if (value == null || value === "") return "";
  return allowed.has(value) ? value : "";
}

function sanitizeNonNegativeNumber(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return "";
  return String(n);
}

function sanitizeSeating(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return "";
  return String(n);
}

function parseFiltersFromSearchParams(searchParams) {
  const next = { ...EMPTY_FILTERS };

  next.brand = (searchParams.get("brand") || "").trim();
  next.fuel_type = sanitizeEnum(searchParams.get("fuel_type"), ALLOWED_FUEL);
  next.transmission = sanitizeEnum(
    searchParams.get("transmission"),
    ALLOWED_TRANSMISSION
  );
  next.vehicle_type = sanitizeEnum(
    searchParams.get("vehicle_type"),
    ALLOWED_VEHICLE_TYPE
  );
  next.min_price = sanitizeNonNegativeNumber(searchParams.get("min_price"));
  next.max_price = sanitizeNonNegativeNumber(searchParams.get("max_price"));
  next.min_mileage = sanitizeNonNegativeNumber(searchParams.get("min_mileage"));
  next.max_mileage = sanitizeNonNegativeNumber(searchParams.get("max_mileage"));
  next.seating_capacity = sanitizeSeating(searchParams.get("seating_capacity"));

  const sortBy = searchParams.get("sort_by");
  const sortOrder = searchParams.get("sort_order");
  next.sort_by = ALLOWED_SORT_BY.has(sortBy) ? sortBy : "created_at";
  next.sort_order = ALLOWED_SORT_ORDER.has(sortOrder) ? sortOrder : "desc";

  // Drop invalid min>max pairs from URL state so refresh stays safe
  const minP = next.min_price === "" ? null : Number(next.min_price);
  const maxP = next.max_price === "" ? null : Number(next.max_price);
  if (minP != null && maxP != null && minP > maxP) {
    next.min_price = "";
    next.max_price = "";
  }
  const minM = next.min_mileage === "" ? null : Number(next.min_mileage);
  const maxM = next.max_mileage === "" ? null : Number(next.max_mileage);
  if (minM != null && maxM != null && minM > maxM) {
    next.min_mileage = "";
    next.max_mileage = "";
  }

  return next;
}

function filtersEqual(a, b) {
  return [...FILTER_KEYS, ...SORT_KEYS].every(
    (key) => (a[key] || "") === (b[key] || "")
  );
}

function buildVehiclesQuery(filters, page, limit) {
  const params = { page, limit };

  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    params[key] = value;
  }

  const sortBy = filters.sort_by || "created_at";
  const sortOrder = filters.sort_order || "desc";
  if (sortBy !== "created_at" || sortOrder !== "desc") {
    params.sort_by = sortBy;
    params.sort_order = sortOrder;
  }

  return params;
}

function filtersToSearchParams(filters, page, limit) {
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }

  const sortBy = filters.sort_by || "created_at";
  const sortOrder = filters.sort_order || "desc";
  if (sortBy !== "created_at" || sortOrder !== "desc") {
    params.set("sort_by", sortBy);
    params.set("sort_order", sortOrder);
  }

  if (page > 1) params.set("page", String(page));
  if (limit !== DEFAULT_LIMIT) params.set("limit", String(limit));

  return params;
}

function hasFilterValues(filters) {
  return FILTER_KEYS.some((key) => Boolean(filters[key]));
}

function VehiclesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlFilters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT)
  );

  const urlFiltersKey = useMemo(
    () => JSON.stringify(urlFilters),
    [urlFilters]
  );

  const [draftFilters, setDraftFilters] = useState(urlFilters);
  const [draftSourceKey, setDraftSourceKey] = useState(urlFiltersKey);
  const [validationErrors, setValidationErrors] = useState({});
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const debounceRef = useRef(null);
  const isDesktopRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    function sync() {
      isDesktopRef.current = mq.matches;
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Sync draft filters when the URL changes externally (back/forward, reset, etc.)
  if (urlFiltersKey !== draftSourceKey) {
    setDraftSourceKey(urlFiltersKey);
    setDraftFilters(urlFilters);
    setValidationErrors({});
  }

  const [reloadToken, setReloadToken] = useState(0);
  const fetchKey = `${searchParams.toString()}::${reloadToken}`;

  const [snapshot, setSnapshot] = useState({
    key: null,
    vehicles: [],
    total: 0,
    pages: 1,
    error: null,
  });

  const loading = snapshot.key !== fetchKey;
  const error = snapshot.key === fetchKey ? snapshot.error : null;
  const vehicles = snapshot.key === fetchKey ? snapshot.vehicles : [];
  const total = snapshot.key === fetchKey ? snapshot.total : 0;
  const pages = snapshot.key === fetchKey ? snapshot.pages : 1;

  const syncUrl = useCallback(
    (nextFilters, nextPage, nextLimit = limit) => {
      const params = filtersToSearchParams(nextFilters, nextPage, nextLimit);
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentUrl = `${pathname}${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`;
      if (nextUrl === currentUrl) return;
      router.push(nextUrl, { scroll: false });
    },
    [limit, pathname, router, searchParams]
  );

  const commitFilters = useCallback(
    (nextFilters, nextPage = 1) => {
      const { ok, errors, sanitized } = validateVehicleFilters(nextFilters);
      if (!ok) {
        setValidationErrors(errors);
        return false;
      }
      setValidationErrors({});
      const merged = {
        ...sanitized,
        sort_by: nextFilters.sort_by || "created_at",
        sort_order: nextFilters.sort_order || "desc",
      };
      setDraftFilters(merged);
      if (!filtersEqual(merged, urlFilters) || nextPage !== page) {
        syncUrl(merged, nextPage);
      }
      return true;
    },
    [page, syncUrl, urlFilters]
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const key = fetchKey;
    const query = buildVehiclesQuery(urlFilters, page, limit);

    getVehicles(query, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        const nextTotal =
          typeof data?.total === "number" ? data.total : items.length;
        const nextPages =
          typeof data?.pages === "number"
            ? Math.max(1, data.pages)
            : Math.max(1, Math.ceil(nextTotal / limit) || 1);

        setSnapshot({
          key,
          vehicles: items,
          total: nextTotal,
          pages: nextPages,
          error: null,
        });
      })
      .catch((err) => {
        if (!active || err?.name === "AbortError") return;
        setSnapshot({
          key,
          vehicles: [],
          total: 0,
          pages: 1,
          error: err?.message || "Failed to load vehicles.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchKey, urlFilters, page, limit]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleFilterChange(nextFilters) {
    setDraftFilters(nextFilters);

    const changedKeys = FILTER_KEYS.filter(
      (key) => (draftFilters[key] || "") !== (nextFilters[key] || "")
    );

    // Mobile drawer: edit draft only until Apply
    if (!isDesktopRef.current) {
      return;
    }

    const onlyTextChanged =
      changedKeys.length > 0 &&
      changedKeys.every((key) => TEXT_FILTER_KEYS.has(key));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (onlyTextChanged) {
      debounceRef.current = setTimeout(() => {
        commitFilters(nextFilters, 1);
      }, 400);
      return;
    }

    // Selects apply immediately on desktop
    if (changedKeys.length > 0) {
      commitFilters(nextFilters, 1);
    }
  }

  function handleApplyFilters() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commitFilters(draftFilters, 1);
  }

  function handleResetFilters() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setValidationErrors({});
    setDraftFilters({ ...EMPTY_FILTERS });
    syncUrl({ ...EMPTY_FILTERS }, 1);
    setMobileFiltersOpen(false);
  }

  function handleClearFilter(key) {
    const next = { ...urlFilters, [key]: "" };
    setDraftFilters(next);
    syncUrl(next, 1);
  }

  function handleSortChange(sortValue) {
    const { sort_by, sort_order } = parseSortValue(sortValue);
    const next = { ...urlFilters, sort_by, sort_order };
    setDraftFilters(next);
    syncUrl(next, 1);
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > pages) return;
    syncUrl(urlFilters, nextPage);
  }

  const activeFilters = hasFilterValues(urlFilters);

  return (
    <div className="page-container section-y space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Explore Vehicles
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Browse the catalog with filters for brand, fuel, transmission, body
            type, price, mileage, and seating. Results use live API data.
          </p>
        </div>
        {!loading && !error ? (
          <p className="text-sm font-medium text-muted-foreground">
            {total} vehicle{total === 1 ? "" : "s"} found
          </p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <VehicleFilters
            filters={draftFilters}
            onChange={handleFilterChange}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            errors={validationErrors}
            mobileOpen={mobileFiltersOpen}
            onMobileOpenChange={setMobileFiltersOpen}
          />
        </aside>

        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ActiveFilterChips
              filters={urlFilters}
              onClear={handleClearFilter}
              onResetAll={activeFilters ? handleResetFilters : undefined}
            />
            <VehicleSort
              value={sortValueFromFilters(urlFilters)}
              onChange={handleSortChange}
              disabled={loading && !error}
              className="sm:ml-auto"
            />
          </div>

          {Object.keys(validationErrors).length > 0 ? (
            <p className="text-sm text-destructive" role="alert">
              Fix the highlighted filter values before applying.
            </p>
          ) : null}

          {error ? (
            <ErrorState
              title="Could not load vehicles"
              description={error}
              onRetry={() => setReloadToken((token) => token + 1)}
              retryLabel="Retry"
            />
          ) : loading ? (
            <VehicleGrid loading skeletonCount={limit} />
          ) : vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles match your filters"
              description={
                activeFilters
                  ? "Try broadening your criteria or reset filters to see the full catalog."
                  : "The catalog is empty right now. Add vehicles from Admin when ready."
              }
              action={
                activeFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetFilters}
                  >
                    Reset Filters
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <VehicleGrid vehicles={vehicles} />
              <VehiclePagination
                page={page}
                pages={pages}
                total={total}
                limit={limit}
                onPageChange={goToPage}
                disabled={loading}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container section-y">
          <VehicleGrid loading skeletonCount={DEFAULT_LIMIT} />
        </div>
      }
    >
      <VehiclesPageContent />
    </Suspense>
  );
}
