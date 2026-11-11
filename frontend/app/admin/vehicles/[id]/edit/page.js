"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { getAdminVehicleById, updateVehicle } from "@/lib/api";

export default function EditVehiclePage() {
  const { id } = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");

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
    setSuccess("Vehicle updated.");
    router.refresh();
  }

  if (loading) return <LoadingSpinner label="Loading vehicle..." />;
  if (error) return <ErrorState description={error} onRetry={loadVehicle} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Edit Vehicle</h1>
          <p className="mt-1 text-muted-foreground">
            Update {vehicle.brand} {vehicle.model}.
          </p>
        </div>
        <Link href="/admin/vehicles">
          <Button variant="outline">Back to Vehicles</Button>
        </Link>
      </div>
      {success ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </p>
      ) : null}
      <VehicleForm initialVehicle={vehicle} submitLabel="Update Vehicle" onSubmit={handleSubmit} />
    </div>
  );
}
