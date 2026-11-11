"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getVehicles } from "@/lib/api";
import { formatPrice, vehicleTitle } from "@/lib/format";

const PAGE_SIZE = 50;

/**
 * Dialog listing catalog vehicles (live API, paginated) with a client-side
 * name filter over the loaded results.
 */
export function CompareVehiclePicker({ open, onOpenChange, selectedIds, maxReached, onSelect }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState({ key: null, items: [], pages: 1, error: null });

  const fetchKey = open ? `${page}::${reloadToken}` : null;
  const loading = open && data.key !== fetchKey;

  useEffect(() => {
    if (!fetchKey) return undefined;
    const controller = new AbortController();
    let active = true;
    const requestedPage = page;

    getVehicles(
      { page: requestedPage, limit: PAGE_SIZE, sort_by: "price", sort_order: "asc" },
      { signal: controller.signal }
    )
      .then((result) => {
        if (!active) return;
        const items = Array.isArray(result?.items) ? result.items : [];
        setData((current) => ({
          key: fetchKey,
          items: requestedPage === 1 ? items : [...current.items, ...items],
          pages: typeof result?.pages === "number" ? result.pages : 1,
          error: null,
        }));
      })
      .catch((err) => {
        if (!active || err?.name === "AbortError") return;
        setData((current) => ({
          ...current,
          key: fetchKey,
          error: err?.message || "Failed to load vehicles.",
        }));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchKey, page]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data.items;
    return data.items.filter((vehicle) =>
      [vehicle.brand, vehicle.model, vehicle.variant]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [data.items, query]);

  function handleOpenChange(next) {
    if (!next) {
      setQuery("");
      setPage(1);
      setData({ key: null, items: [], pages: 1, error: null });
    }
    onOpenChange(next);
  }

  const initialLoading = loading && data.items.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(720px,calc(100dvh-2rem))] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="gap-1.5 border-b border-border px-5 pt-5 pb-4">
          <DialogTitle className="font-heading text-lg font-bold">Add a vehicle</DialogTitle>
          <DialogDescription>
            {maxReached
              ? "Your compare list is full. Remove a vehicle to add another."
              : `Choose from the catalog. ${selectedIds.length} of 3 selected.`}
          </DialogDescription>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by brand, model or variant"
              className="pl-9"
              aria-label="Filter vehicles"
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {data.error && data.items.length === 0 ? (
            <ErrorState
              className="m-3"
              title="Could not load vehicles"
              description={data.error}
              onRetry={() => setReloadToken((token) => token + 1)}
            />
          ) : initialLoading ? (
            <ul className="space-y-1" aria-busy="true">
              {Array.from({ length: 5 }, (_, index) => (
                <li key={index} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-12 w-[4.5rem] rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </li>
              ))}
            </ul>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {data.items.length === 0
                ? "The catalog is empty right now."
                : "No loaded vehicles match that name."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((vehicle) => {
                const selected = selectedIds.includes(vehicle.id);
                const disabled = selected || maxReached;
                return (
                  <li key={vehicle.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelect(vehicle)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <VehicleImage
                        src={vehicle.image_url}
                        alt=""
                        aspect={null}
                        className="h-12 w-[4.5rem] shrink-0 rounded-md"
                        iconClassName="size-5"
                        showFallbackLabel={false}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-heading text-sm font-bold text-foreground">
                          {vehicleTitle(vehicle)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[vehicle.variant, vehicle.fuel_type, vehicle.transmission]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-sm font-semibold text-foreground tabular sm:block">
                        {formatPrice(vehicle.price)}
                      </span>
                      <span
                        className={
                          selected
                            ? "flex size-8 shrink-0 items-center justify-center rounded-md bg-sage text-primary"
                            : "flex size-8 shrink-0 items-center justify-center rounded-md border border-input text-foreground"
                        }
                        aria-hidden="true"
                      >
                        {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </span>
                      <span className="sr-only">
                        {selected ? "Already selected" : "Add to compare"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {page < data.pages && !initialLoading ? (
          <div className="border-t border-border px-5 py-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={() => setPage((current) => current + 1)}
            >
              {loading ? "Loading…" : "Load more vehicles"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
