"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { createVehicle } from "@/lib/api";
import { vehicleTitle } from "@/lib/format";

export default function NewVehiclePage() {
  const router = useRouter();

  async function handleSubmit(payload) {
    const created = await createVehicle(payload);
    toast.success(`${vehicleTitle(created)} created`);
    router.push(`/admin/vehicles/${created.id}/edit`);
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
          title="Add vehicle"
          description="New vehicles become available to browsing and recommendations immediately."
        />
      </div>
      <VehicleForm submitLabel="Create vehicle" onSubmit={handleSubmit} />
    </div>
  );
}
