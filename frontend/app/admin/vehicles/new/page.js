"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { Button } from "@/components/ui/button";
import { createVehicle } from "@/lib/api";

export default function NewVehiclePage() {
  const router = useRouter();

  async function handleSubmit(payload) {
    const created = await createVehicle(payload);
    router.push(`/admin/vehicles/${created.id}/edit`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Add Vehicle</h1>
          <p className="mt-1 text-muted-foreground">
            Create a vehicle that immediately becomes available to browsing and recommendations.
          </p>
        </div>
        <Link href="/admin/vehicles">
          <Button variant="outline">Back to Vehicles</Button>
        </Link>
      </div>
      <VehicleForm submitLabel="Create Vehicle" onSubmit={handleSubmit} />
    </div>
  );
}
