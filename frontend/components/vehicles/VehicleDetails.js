"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, GitCompareArrows } from "lucide-react";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { VehicleSpecifications } from "@/components/vehicles/VehicleSpecifications";
import { PriceDisplay } from "@/components/vehicles/PriceDisplay";
import { SpecificationItem } from "@/components/vehicles/SpecificationItem";
import { SimilarVehicles } from "@/components/vehicles/SimilarVehicles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  MAX_COMPARE,
  addToCompare,
  getCompareIds,
  isInCompare,
  removeFromCompare,
} from "@/lib/compare";
import { formatMileage, vehicleTitle } from "@/lib/format";

/**
 * Full vehicle detail presentation for /vehicles/[id].
 */
export function VehicleDetails({ vehicle }) {
  const router = useRouter();
  const [inCompare, setInCompare] = useState(false);
  const [compareCount, setCompareCount] = useState(0);

  useEffect(() => {
    function sync() {
      setInCompare(isInCompare(vehicle?.id));
      setCompareCount(getCompareIds().length);
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("vehicleai:compare-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("vehicleai:compare-change", sync);
    };
  }, [vehicle?.id]);

  if (!vehicle) return null;

  const title = vehicleTitle(vehicle);

  function handleCompareToggle() {
    if (inCompare) {
      removeFromCompare(vehicle.id);
      toast(`${title} removed from compare`);
      return;
    }
    const result = addToCompare(vehicle.id);
    if (result.ok) {
      toast.success(result.reason || `${title} added to compare`, {
        description: `${result.ids.length} of ${MAX_COMPARE} selected`,
        action: { label: "Open compare", onClick: () => router.push("/compare") },
      });
    } else {
      toast.error(result.reason || "Could not add to compare", {
        action: { label: "Manage", onClick: () => router.push("/compare") },
      });
    }
  }

  const recommendationsHref = (() => {
    const params = new URLSearchParams();
    if (vehicle.fuel_type) params.set("fuel_type", vehicle.fuel_type);
    if (vehicle.transmission) params.set("transmission", vehicle.transmission);
    if (vehicle.vehicle_type) params.set("vehicle_type", vehicle.vehicle_type);
    if (vehicle.seating_capacity != null) {
      params.set("seating_capacity", String(vehicle.seating_capacity));
    }
    if (vehicle.mileage != null) {
      params.set("minimum_mileage", String(vehicle.mileage));
    }
    if (vehicle.price != null) {
      params.set("budget", String(vehicle.price));
    }
    const qs = params.toString();
    return qs ? `/recommendations?${qs}` : "/recommendations";
  })();

  const keySpecs = [
    { label: "Mileage", value: formatMileage(vehicle) },
    {
      label: "Seating",
      value: vehicle.seating_capacity != null ? `${vehicle.seating_capacity} seats` : null,
    },
    {
      label: "Safety rating",
      value: vehicle.safety_rating != null ? `${vehicle.safety_rating} / 5` : null,
    },
    {
      label: "Boot space",
      value: vehicle.boot_space != null ? `${vehicle.boot_space} L` : null,
    },
  ];

  const compareFull = !inCompare && compareCount >= MAX_COMPARE;

  return (
    <div className="space-y-14">
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/vehicles" />}>Vehicles</BreadcrumbLink>
            </BreadcrumbItem>
            {vehicle.vehicle_type ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={
                      <Link
                        href={`/vehicles?vehicle_type=${encodeURIComponent(vehicle.vehicle_type)}`}
                      />
                    }
                  >
                    {vehicle.vehicle_type}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            ) : null}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          <VehicleImage
            src={vehicle.image_url}
            alt={title}
            aspect="wide"
            eager
            className="rounded-2xl"
            iconClassName="size-20"
          />

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-6">
              <div className="space-y-3">
                {vehicle.brand ? <p className="eyebrow">{vehicle.brand}</p> : null}
                <h1 className="font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">
                  {vehicle.model || title}
                </h1>
                {vehicle.variant ? (
                  <p className="text-lg text-muted-foreground">{vehicle.variant}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {vehicle.vehicle_type ? <Badge variant="sage">{vehicle.vehicle_type}</Badge> : null}
                  {vehicle.fuel_type ? <Badge variant="outline">{vehicle.fuel_type}</Badge> : null}
                  {vehicle.transmission ? (
                    <Badge variant="outline">{vehicle.transmission}</Badge>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                <PriceDisplay price={vehicle.price} size="lg" label="Price" full />

                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5">
                  {keySpecs.map((spec) => (
                    <SpecificationItem key={spec.label} label={spec.label} value={spec.value} />
                  ))}
                </dl>

                <div className="mt-6 grid gap-2.5">
                  <Button
                    type="button"
                    size="lg"
                    variant={inCompare ? "sage" : "default"}
                    onClick={handleCompareToggle}
                    aria-pressed={inCompare}
                    disabled={compareFull}
                  >
                    {inCompare ? (
                      <Check data-icon="inline-start" aria-hidden="true" />
                    ) : (
                      <GitCompareArrows data-icon="inline-start" aria-hidden="true" />
                    )}
                    {inCompare ? "Added to compare" : "Add to compare"}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={recommendationsHref} />}
                  >
                    Find similar recommendations
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground" role="status">
                  {compareFull ? (
                    <>
                      Your compare list is full ({MAX_COMPARE} vehicles).{" "}
                      <Link href="/compare" className="font-medium text-primary underline-offset-4 hover:underline">
                        Manage compare
                      </Link>
                    </>
                  ) : inCompare ? (
                    <>
                      {compareCount} of {MAX_COMPARE} selected.{" "}
                      <Link href="/compare" className="font-medium text-primary underline-offset-4 hover:underline">
                        Open compare
                      </Link>
                    </>
                  ) : (
                    `Compare up to ${MAX_COMPARE} vehicles side by side.`
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {vehicle.description ? (
        <section className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8" aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="font-heading text-xl font-bold">
            Overview
          </h2>
          <p className="max-w-3xl text-base leading-relaxed whitespace-pre-wrap text-foreground/80">
            {vehicle.description}
          </p>
        </section>
      ) : null}

      <section className="space-y-6" aria-labelledby="specs-heading">
        <h2 id="specs-heading" className="font-heading text-2xl font-bold">
          Technical specifications
        </h2>
        <VehicleSpecifications vehicle={vehicle} />
      </section>

      <SimilarVehicles vehicle={vehicle} />
    </div>
  );
}
