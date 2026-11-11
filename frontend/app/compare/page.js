"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GitCompareArrows, Plus, X } from "lucide-react";
import { ComparisonTable } from "@/components/compare/ComparisonTable";
import { CompareVehiclePicker } from "@/components/compare/CompareVehiclePicker";
import { PageHeader } from "@/components/layout/PageHeader";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { PriceDisplay } from "@/components/vehicles/PriceDisplay";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getVehicleById } from "@/lib/api";
import {
  MAX_COMPARE,
  addToCompare,
  getCompareSnapshot,
  removeFromCompare,
  subscribeCompare,
} from "@/lib/compare";
import { vehicleTitle } from "@/lib/format";

function useCompareIds() {
  const snapshot = useSyncExternalStore(
    subscribeCompare,
    getCompareSnapshot,
    () => null
  );
  const ids = useMemo(
    () => (snapshot ? snapshot.split(",").map(Number) : []),
    [snapshot]
  );
  return { ids, hydrated: snapshot !== null };
}

function SelectedVehicleCard({ vehicle, onRemove }) {
  const title = vehicleTitle(vehicle);
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <VehicleImage
        src={vehicle.image_url}
        alt={title}
        aspect="card"
        showFallbackLabel={false}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="absolute top-3 right-3 bg-card/95"
        onClick={() => onRemove(vehicle)}
        aria-label={`Remove ${title} from compare`}
      >
        <X aria-hidden="true" />
      </Button>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{vehicle.brand}</p>
          <h2 className="font-heading text-lg leading-snug font-bold">
            <Link href={`/vehicles/${vehicle.id}`} className="hover:text-primary">
              {vehicle.model || title}
            </Link>
          </h2>
          {vehicle.variant ? (
            <p className="truncate text-sm text-muted-foreground">{vehicle.variant}</p>
          ) : null}
        </div>
        <PriceDisplay price={vehicle.price} size="md" className="mt-auto" />
      </div>
    </article>
  );
}

function SlotSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2 p-5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

function EmptySlot({ onAdd, index }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-input bg-card/50 p-6 text-center transition-colors outline-none hover:border-primary/50 hover:bg-sage/40 focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-sage text-primary">
        <Plus className="size-5" aria-hidden="true" />
      </span>
      <span className="font-heading text-sm font-bold">Add vehicle {index}</span>
      <span className="text-xs text-muted-foreground">Choose from the catalog</span>
    </button>
  );
}

export default function ComparePage() {
  const { ids, hydrated } = useCompareIds();
  const [records, setRecords] = useState({});
  const [retryToken, setRetryToken] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const requestedRef = useRef(new Set());

  useEffect(() => {
    for (const id of ids) {
      if (requestedRef.current.has(id)) continue;
      requestedRef.current.add(id);

      getVehicleById(id)
        .then((vehicle) => {
          setRecords((current) => ({ ...current, [id]: { vehicle, error: null } }));
        })
        .catch((err) => {
          if (err?.status === 404) {
            removeFromCompare(id);
            requestedRef.current.delete(id);
            toast("A vehicle in your compare list is no longer available and was removed.");
            return;
          }
          setRecords((current) => ({
            ...current,
            [id]: { vehicle: null, error: err?.message || "Failed to load vehicle." },
          }));
        });
    }
  }, [ids, retryToken]);

  const vehicles = ids.map((id) => records[id]?.vehicle).filter(Boolean);
  const failedIds = ids.filter((id) => records[id]?.error);
  const pendingCount = ids.filter((id) => !records[id]).length;
  const maxReached = ids.length >= MAX_COMPARE;

  function retryFailed() {
    for (const id of failedIds) requestedRef.current.delete(id);
    setRecords((current) => {
      const next = { ...current };
      for (const id of failedIds) delete next[id];
      return next;
    });
    setRetryToken((token) => token + 1);
  }

  function handleRemove(vehicle) {
    removeFromCompare(vehicle.id);
    toast(`${vehicleTitle(vehicle)} removed from compare`);
  }

  function handleClear() {
    for (const id of ids) removeFromCompare(id);
  }

  function handleSelect(vehicle) {
    const result = addToCompare(vehicle.id);
    if (!result.ok) {
      toast.error(result.reason || "Could not add to compare");
      return;
    }
    setRecords((current) =>
      current[vehicle.id] ? current : { ...current, [vehicle.id]: { vehicle, error: null } }
    );
    requestedRef.current.add(vehicle.id);
    if (result.ids.length >= MAX_COMPARE) setPickerOpen(false);
  }

  const slots = Array.from({ length: MAX_COMPARE }, (_, index) => ids[index] ?? null);

  return (
    <div className="page-container space-y-10 pt-10 pb-16 sm:pt-14 sm:pb-20">
      <PageHeader
        eyebrow="Compare"
        title="Compare side by side"
        description={`Shortlist up to ${MAX_COMPARE} vehicles and see how they stack up on price, efficiency, performance and practicality.`}
        actions={
          ids.length > 0 ? (
            <>
              <Button type="button" variant="ghost" onClick={handleClear}>
                Clear all
              </Button>
              <Button type="button" onClick={() => setPickerOpen(true)} disabled={maxReached}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add vehicle
              </Button>
            </>
          ) : null
        }
      />

      {!hydrated ? (
        <div className="grid gap-5 md:grid-cols-3">
          <SlotSkeleton />
          <SlotSkeleton />
          <SlotSkeleton />
        </div>
      ) : ids.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="Your compare list is empty"
          description={`Add up to ${MAX_COMPARE} vehicles here, or use “Add to compare” on any vehicle page.`}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => setPickerOpen(true)}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add a vehicle
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link href="/vehicles" />}>
                Browse vehicles
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <section aria-label="Selected vehicles" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((id, index) => {
              if (id == null) {
                return (
                  <EmptySlot key={`slot-${index}`} index={index + 1} onAdd={() => setPickerOpen(true)} />
                );
              }
              const record = records[id];
              if (!record) return <SlotSkeleton key={id} />;
              if (record.error) {
                return (
                  <div
                    key={id}
                    className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.04] p-6 text-center"
                  >
                    <p className="text-sm text-muted-foreground">Could not load this vehicle.</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={retryFailed}>
                        Retry
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCompare(id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              }
              return <SelectedVehicleCard key={id} vehicle={record.vehicle} onRemove={handleRemove} />;
            })}
          </section>

          {vehicles.length > 0 ? (
            <section aria-labelledby="comparison-heading" className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="comparison-heading" className="font-heading text-2xl font-bold">
                    Specifications
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vehicles.length < 2
                      ? "Add another vehicle to see where they differ."
                      : pendingCount > 0
                        ? "Loading remaining vehicles…"
                        : "Rows marked with a dot have values that differ."}
                  </p>
                </div>
                {vehicles.length > 1 ? (
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="highlight-differences"
                      checked={highlight}
                      onCheckedChange={(checked) => setHighlight(Boolean(checked))}
                    />
                    <Label htmlFor="highlight-differences" className="text-sm font-medium">
                      Highlight differences
                    </Label>
                  </div>
                ) : null}
              </div>
              <ComparisonTable vehicles={vehicles} highlightDifferences={highlight} />
              <p className="text-xs text-muted-foreground md:hidden">
                Scroll the table sideways to see every vehicle.
              </p>
            </section>
          ) : null}
        </>
      )}

      <CompareVehiclePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedIds={ids}
        maxReached={maxReached}
        onSelect={handleSelect}
      />
    </div>
  );
}
