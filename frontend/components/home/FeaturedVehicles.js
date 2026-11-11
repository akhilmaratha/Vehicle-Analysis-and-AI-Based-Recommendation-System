"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VehicleGrid } from "@/components/vehicles/VehicleGrid";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { getVehicles } from "@/lib/api";

const FEATURED_LIMIT = 6;

/** Latest vehicles from the live catalog. */
export function FeaturedVehicles() {
  const [featured, setFeatured] = useState([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [snapshot, setSnapshot] = useState({ key: null, error: null });

  const loading = snapshot.key !== fetchKey;
  const error = snapshot.key === fetchKey ? snapshot.error : null;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const key = fetchKey;

    getVehicles({ limit: FEATURED_LIMIT, page: 1 }, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setFeatured(Array.isArray(data?.items) ? data.items : []);
        setSnapshot({ key, error: null });
      })
      .catch((err) => {
        if (!active || err?.name === "AbortError") return;
        setFeatured([]);
        setSnapshot({
          key,
          error: err?.message || "Failed to load featured vehicles.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchKey]);

  if (error) {
    return (
      <ErrorState
        title="Could not load the latest vehicles"
        description={error}
        onRetry={() => setFetchKey((key) => key + 1)}
      />
    );
  }

  if (loading) {
    return <VehicleGrid loading skeletonCount={FEATURED_LIMIT} />;
  }

  if (featured.length === 0) {
    return (
      <EmptyState
        title="No vehicles to feature yet"
        description="Once vehicles are added to the catalog, the latest arrivals will appear here."
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/vehicles" />}>
            Explore vehicles
          </Button>
        }
      />
    );
  }

  return <VehicleGrid vehicles={featured} />;
}
