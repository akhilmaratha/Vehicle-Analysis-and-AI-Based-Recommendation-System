"use client";

import { useEffect, useState } from "react";
import { VehicleGrid } from "@/components/vehicles/VehicleGrid";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { getVehicles } from "@/lib/api";

const LIMIT = 3;

/**
 * Other vehicles of the same body type, using the existing `vehicle_type` filter.
 * Renders nothing when there are no other matches or the request fails.
 */
export function SimilarVehicles({ vehicle }) {
  const vehicleType = vehicle?.vehicle_type;
  const vehicleId = vehicle?.id;
  const [state, setState] = useState({ key: null, items: [] });
  const key = `${vehicleType}::${vehicleId}`;

  useEffect(() => {
    if (!vehicleType) return undefined;
    const controller = new AbortController();
    let active = true;

    getVehicles(
      { vehicle_type: vehicleType, limit: LIMIT + 1, page: 1 },
      { signal: controller.signal }
    )
      .then((data) => {
        if (!active) return;
        const items = (Array.isArray(data?.items) ? data.items : [])
          .filter((item) => item.id !== vehicleId)
          .slice(0, LIMIT);
        setState({ key, items });
      })
      .catch((err) => {
        if (!active || err?.name === "AbortError") return;
        setState({ key, items: [] });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, vehicleId, vehicleType]);

  if (!vehicleType) return null;
  const loading = state.key !== key;
  if (!loading && state.items.length === 0) return null;

  return (
    <section className="space-y-8 border-t border-border pt-14" aria-label="Similar vehicles">
      <SectionHeading
        eyebrow="Keep exploring"
        title={`Other ${vehicleType === "Other" ? "vehicles" : `${vehicleType}s`} to consider`}
      />
      <VehicleGrid
        loading={loading}
        skeletonCount={LIMIT}
        vehicles={state.items}
        className="xl:grid-cols-3"
      />
    </section>
  );
}
