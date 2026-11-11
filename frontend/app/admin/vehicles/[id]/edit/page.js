"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Eye } from "lucide-react";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminVehicleById, updateVehicle } from "@/lib/api";
import { vehicleTitle } from "@/lib/format";
import { vehicleHref } from "@/lib/vehicle-slug";

function EditSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true" aria-label="Loading vehicle">
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export default function EditVehiclePage() {
  const { id } = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadVehicle() {
    setLoading(true);
    setError("");
    try {
      setVehicle(await getAdminVehicleById(id));
    } catch (err) {
      setError(err?.message || "Unable to load vehicle");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    getAdminVehicleById(id)
      .then((data) => {
        if (!ignore) setVehicle(data);
      })
      .catch((err) => {
        if (!ignore) setError(err?.message || "Unable to load vehicle");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  async function handleSubmit(payload) {
    const updated = await updateVehicle(id, payload);
    setVehicle(updated);
    toast.success("Vehicle updated", { description: vehicleTitle(updated) });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3 text-muted-foreground"
          nativeButton={false}
          render={<Link href="/admin/vehicles" />}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Vehicles
        </Button>
        <PageHeader
          size="compact"
          title={vehicle ? `Edit ${vehicleTitle(vehicle)}` : "Edit vehicle"}
          description={vehicle ? `Vehicle #${vehicle.id}` : undefined}
          actions={
            vehicle ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={vehicleHref(vehicle)} />}
              >
                <Eye data-icon="inline-start" aria-hidden="true" />
                View on site
              </Button>
            ) : null
          }
        />
      </div>

      {loading ? (
        <EditSkeleton />
      ) : error ? (
        <ErrorState title="Could not load vehicle" description={error} onRetry={loadVehicle} />
      ) : (
        <VehicleForm
          key={vehicle.id}
          initialVehicle={vehicle}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
