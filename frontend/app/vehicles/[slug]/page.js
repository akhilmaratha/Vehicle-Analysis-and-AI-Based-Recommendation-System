"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { VehicleDetails } from "@/components/vehicles/VehicleDetails";
import { VehicleDetailsSkeleton } from "@/components/vehicles/VehicleDetailsSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { getVehicleById } from "@/lib/api";
import {
  parseVehicleIdFromSlug,
  vehicleHref,
  vehicleSlug,
} from "@/lib/vehicle-slug";
import { peekVehicleDetail } from "@/lib/vehicles-cache";

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const vehicleId = parseVehicleIdFromSlug(rawSlug);
  const invalidSlug = vehicleId == null;

  const cached = !invalidSlug ? peekVehicleDetail(vehicleId) : null;
  const [reloadToken, setReloadToken] = useState(0);
  const [snapshot, setSnapshot] = useState(() => {
    if (!cached?.data) {
      return { key: null, vehicle: null, error: null, notFound: false };
    }
    return {
      key: `${vehicleId}::0`,
      vehicle: cached.data,
      error: null,
      notFound: false,
    };
  });

  const fetchKey = invalidSlug
    ? `invalid::${reloadToken}`
    : `${vehicleId}::${reloadToken}`;

  const display =
    snapshot.key === fetchKey
      ? snapshot
      : cached?.data
        ? {
            key: fetchKey,
            vehicle: cached.data,
            error: null,
            notFound: false,
          }
        : snapshot;

  const loading = !invalidSlug && display.key !== fetchKey;
  const error =
    !invalidSlug && display.key === fetchKey ? display.error : null;
  const notFound =
    invalidSlug ||
    (display.key === fetchKey ? display.notFound : false);
  const vehicle =
    !invalidSlug && display.key === fetchKey ? display.vehicle : null;

  useEffect(() => {
    if (invalidSlug) return;

    const controller = new AbortController();
    let active = true;
    const key = fetchKey;
    const hit = peekVehicleDetail(vehicleId);

    if (hit?.data) {
      // Defer so the effect does not sync-set during render cascade (eslint).
      queueMicrotask(() => {
        if (!active) return;
        setSnapshot({
          key,
          vehicle: hit.data,
          error: null,
          notFound: false,
        });
      });
    }

    getVehicleById(vehicleId, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setSnapshot({
          key,
          vehicle: data,
          error: null,
          notFound: false,
        });

        // Normalize legacy `/vehicles/12` (and mismatched slugs) to the canonical name slug.
        const canonical = vehicleSlug(data);
        if (rawSlug && canonical && rawSlug !== canonical) {
          router.replace(vehicleHref(data));
        }
      })
      .catch((err) => {
        if (!active || err?.name === "AbortError") return;
        if (hit?.data) return;
        const is404 = err?.status === 404;
        setSnapshot({
          key,
          vehicle: null,
          error: is404
            ? null
            : err?.message || "Failed to load vehicle details.",
          notFound: is404,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchKey, invalidSlug, vehicleId, rawSlug, router]);

  return (
    <div className="page-container pt-8 pb-16 sm:pt-10 sm:pb-20">
      {notFound ? (
        <EmptyState
          title="Vehicle not found"
          description="This vehicle may have been removed, or the link is invalid."
          action={
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href="/vehicles" />}
            >
              Back to vehicles
            </Button>
          }
        />
      ) : error ? (
        <ErrorState
          title="Could not load vehicle"
          description={error}
          onRetry={() => setReloadToken((token) => token + 1)}
          retryLabel="Retry"
        />
      ) : loading ? (
        <VehicleDetailsSkeleton />
      ) : (
        <VehicleDetails vehicle={vehicle} />
      )}
    </div>
  );
}
