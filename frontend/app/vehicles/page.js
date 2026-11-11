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
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { getVehicles } from "@/lib/api";
import { invalidateVehiclesCache, peekVehiclesList } from "@/lib/vehicles-cache";

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
  const resultsRef = useRef(null);

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
  const query = useMemo(
    () => buildVehiclesQuery(urlFilters, page, limit),
    [urlFilters, page, limit]
  );

  const cachedHit = peekVehiclesList(query);
  const [snapshot, setSnapshot] = useState(() => {
    if (!cachedHit?.data) {
      return {
        key: null,
        vehicles: [],
        total: 0,
        pages: 1,
        error: null,
      };
    }
    const items = Array.isArray(cachedHit.data.items) ? cachedHit.data.items : [];
    const nextTotal =
      typeof cachedHit.data.total === "number"
        ? cachedHit.data.total
        : items.length;
    const nextPages =
      typeof cachedHit.data.pages === "number"
        ? Math.max(1, cachedHit.data.pages)
        : Math.max(1, Math.ceil(nextTotal / limit) || 1);
    return {
      key: fetchKey,
      vehicles: items,
      total: nextTotal,
      pages: nextPages,
      error: null,
    };
  });

  const display =
    snapshot.key === fetchKey
      ? snapshot
      : cachedHit?.data
        ? {
            key: fetchKey,
            vehicles: Array.isArray(cachedHit.data.items)
              ? cachedHit.data.items
              : [],
            total:
              typeof cachedHit.data.total === "number"
                ? cachedHit.data.total
                : 0,
            pages:
              typeof cachedHit.data.pages === "number"
                ? Math.max(1, cachedHit.data.pages)
                : 1,
            error: null,
          }
        : snapshot;

  const loading = display.key !== fetchKey;
  const refreshing = !loading && snapshot.key === fetchKey && !cachedHit?.fresh;
  const error = display.key === fetchKey ? display.error : null;
  const vehicles = display.key === fetchKey ? display.vehicles : [];
  const total = display.key === fetchKey ? display.total : 0;
  const pages = display.key === fetchKey ? display.pages : 1;

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
    const hit = peekVehiclesList(query);

    // Paint instantly from memory when returning from a detail page.
    if (hit?.data) {
      const items = Array.isArray(hit.data.items) ? hit.data.items : [];
      const nextTotal =
        typeof hit.data.total === "number" ? hit.data.total : items.length;
      const nextPages =
        typeof hit.data.pages === "number"
          ? Math.max(1, hit.data.pages)
          : Math.max(1, Math.ceil(nextTotal / limit) || 1);
      // Defer so the effect does not sync-set during render cascade (eslint).
      queueMicrotask(() => {
        if (!active) return;
        setSnapshot({
          key,
          vehicles: items,
          total: nextTotal,
          pages: nextPages,
          error: null,
        });
      });
    }

    // Fresh cache: skip network. Stale/missing: fetch (deduped in api layer).
    getVehicles(query, {
      signal: controller.signal,
      force: reloadToken > 0 && !hit?.fresh,
    })
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
        // Keep cached vehicles visible if a background refresh fails.
        if (hit?.data) return;
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
  }, [fetchKey, query, limit, reloadToken]);

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
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeFilters = hasFilterValues(urlFilters);

  return (
    <div className="page-container space-y-8 pt-10 pb-16 sm:pt-14 sm:pb-20">
      <PageHeader
        eyebrow="Catalog"
        title="Explore vehicles"
        description="Browse the full catalog and narrow it down by brand, budget, fuel, transmission, body type, mileage and seating."
      />

      <div className="grid gap-8 lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
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

        <div ref={resultsRef} className="min-w-0 scroll-mt-24 space-y-6">
          <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-heading text-base font-semibold tabular" aria-live="polite">
              {loading && !error ? (
                <span className="text-muted-foreground">Loading vehicles…</span>
              ) : error ? (
                <span className="text-muted-foreground">Results unavailable</span>
              ) : (
                <>
                  {total} vehicle{total === 1 ? "" : "s"}
                  <span className="font-normal text-muted-foreground">
                    {activeFilters ? " match your filters" : " in the catalog"}
                    {refreshing ? " · updating" : ""}
                  </span>
                </>
              )}
            </p>
            <VehicleSort
              value={sortValueFromFilters(urlFilters)}
              onChange={handleSortChange}
              disabled={loading && !error}
            />
          </div>

          <ActiveFilterChips
            filters={urlFilters}
            onClear={handleClearFilter}
            onResetAll={activeFilters ? handleResetFilters : undefined}
          />

          {Object.keys(validationErrors).length > 0 ? (
            <p className="text-sm text-destructive" role="alert">
              Fix the highlighted filter values before applying.
            </p>
          ) : null}

          {error ? (
            <ErrorState
              title="Could not load vehicles"
              description={error}
              onRetry={() => {
                invalidateVehiclesCache();
                setReloadToken((token) => token + 1);
              }}
              retryLabel="Retry"
            />
          ) : loading ? (
            <VehicleGrid loading skeletonCount={limit} />
          ) : vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles match your filters"
              description={
                activeFilters
                  ? "Try widening your budget or removing a filter or two to see more of the catalog."
                  : "The catalog is empty right now. Vehicles added from Admin will appear here."
              }
              action={
                activeFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetFilters}
                  >
                    Clear all filters
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
        <div className="page-container pt-10 pb-16 sm:pt-14">
          <VehicleGrid loading skeletonCount={DEFAULT_LIMIT} />
        </div>
      }
    >
      <VehiclesPageContent />
    </Suspense>
  );
}
