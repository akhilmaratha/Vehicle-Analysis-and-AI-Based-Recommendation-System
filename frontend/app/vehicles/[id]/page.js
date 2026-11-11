"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VehicleDetails } from "@/components/vehicles/VehicleDetails";
import { VehicleDetailsSkeleton } from "@/components/vehicles/VehicleDetailsSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { getVehicleById } from "@/lib/api";

function parseVehicleId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = parseVehicleId(params?.id);
  const invalidId = vehicleId == null;

  const [reloadToken, setReloadToken] = useState(0);
  const [snapshot, setSnapshot] = useState({
    key: null,
    vehicle: null,
    error: null,
    notFound: false,
  });

  const fetchKey = invalidId
    ? `invalid::${reloadToken}`
    : `${vehicleId}::${reloadToken}`;

  const loading = !invalidId && snapshot.key !== fetchKey;
  const error = !invalidId && snapshot.key === fetchKey ? snapshot.error : null;
  const notFound =
    invalidId ||
    (snapshot.key === fetchKey ? snapshot.notFound : false);
  const vehicle =
    !invalidId && snapshot.key === fetchKey ? snapshot.vehicle : null;

  useEffect(() => {
    if (invalidId) return;

    const controller = new AbortController();
    let active = true;
    const key = fetchKey;

    getVehicleById(vehicleId, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setSnapshot({
          key,
          vehicle: data,
          error: null,
          notFound: false,
        });
      })
      .catch((err) => {
        if (!active || err?.name === "AbortError") return;
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
  }, [fetchKey, invalidId, vehicleId]);

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
