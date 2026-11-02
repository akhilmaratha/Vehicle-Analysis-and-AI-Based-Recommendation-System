"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GitCompareArrows,
  Sparkles,
} from "lucide-react";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { VehicleSpecifications } from "@/components/vehicles/VehicleSpecifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MAX_COMPARE,
  addToCompare,
  isInCompare,
  removeFromCompare,
} from "@/lib/compare";
import { formatINR } from "@/lib/format";

/**
 * Full vehicle detail presentation for /vehicles/[id].
 */
export function VehicleDetails({ vehicle }) {
  const [inCompare, setInCompare] = useState(false);
  const [compareMessage, setCompareMessage] = useState("");

  useEffect(() => {
    function sync() {
      setInCompare(isInCompare(vehicle?.id));
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

  const title = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  function handleCompareToggle() {
    if (inCompare) {
      removeFromCompare(vehicle.id);
      setCompareMessage("Removed from compare list.");
      return;
    }
    const result = addToCompare(vehicle.id);
    setCompareMessage(
      result.ok
        ? result.reason || "Added to compare list."
        : result.reason || "Could not add to compare."
    );
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

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          nativeButton={false}
          render={<Link href="/vehicles" />}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Vehicles
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {title || "Vehicle"}
            </h1>
            {vehicle.variant ? (
              <p className="text-base text-muted-foreground">{vehicle.variant}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {vehicle.vehicle_type ? (
                <Badge variant="secondary">{vehicle.vehicle_type}</Badge>
              ) : null}
              {vehicle.fuel_type ? (
                <Badge variant="outline">{vehicle.fuel_type}</Badge>
              ) : null}
              {vehicle.transmission ? (
                <Badge variant="outline">{vehicle.transmission}</Badge>
              ) : null}
            </div>
          </div>
          <p className="text-2xl font-semibold text-primary sm:text-3xl">
            {formatINR(vehicle.price)}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <VehicleImage
          src={vehicle.image_url}
          alt={title || "Vehicle"}
          className="rounded-xl border border-border/80 shadow-sm"
          aspect="wide"
        />
        <VehicleSpecifications vehicle={vehicle} />
      </div>

      {vehicle.description ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {vehicle.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            nativeButton={false}
            render={<Link href="/vehicles" />}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Vehicles
          </Button>
          <Button
            type="button"
            variant={inCompare ? "secondary" : "outline"}
            className="gap-2"
            onClick={handleCompareToggle}
            aria-pressed={inCompare}
          >
            <GitCompareArrows className="size-4" aria-hidden="true" />
            {inCompare ? "Remove from Compare" : "Add to Compare"}
          </Button>
          <Button
            type="button"
            className="gap-2"
            nativeButton={false}
            render={<Link href={recommendationsHref} />}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Get Recommendations
          </Button>
        </div>
        {compareMessage ? (
          <p className="text-sm text-muted-foreground" role="status">
            {compareMessage}
            {inCompare ? (
              <>
                {" "}
                <Link
                  href="/compare"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open Compare
                </Link>
                {" "}
                (up to {MAX_COMPARE} vehicles; full compare UI is Phase 6).
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Compare uses a local shortlist (max {MAX_COMPARE}). The full compare
            experience lands in a later phase.
          </p>
        )}
      </div>
    </div>
  );
}
