import Link from "next/link";
import { Fuel, Gauge, Settings2, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { formatPrice } from "@/lib/format";

export function VehicleCard({ vehicle }) {
  const title = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  const mileageLabel =
    vehicle.fuel_type === "Electric"
      ? `${vehicle.mileage ?? "—"} km/charge`
      : `${vehicle.mileage ?? "—"} km/l`;

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        <VehicleImage
          src={vehicle.image_url}
          alt={title || "Vehicle"}
          className="h-40"
          aspect={null}
          iconClassName="size-14"
          showFallbackLabel={false}
        />
        {vehicle.vehicle_type ? (
          <Badge className="absolute left-3 top-3 bg-white/95 text-foreground shadow-sm">
            {vehicle.vehicle_type}
          </Badge>
        ) : null}
      </div>

      <CardHeader className="gap-1 pb-2">
        <CardTitle className="text-base leading-snug">
          {title || "Untitled vehicle"}
        </CardTitle>
        {vehicle.variant ? (
          <p className="text-sm text-muted-foreground">{vehicle.variant}</p>
        ) : null}
        <p className="pt-1 text-lg font-semibold text-primary">
          {formatPrice(vehicle.price)}
        </p>
      </CardHeader>

      <CardContent className="space-y-2 pb-3">
        <div className="flex flex-wrap gap-2">
          {vehicle.fuel_type ? (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Fuel className="size-3" aria-hidden="true" />
              {vehicle.fuel_type}
            </Badge>
          ) : null}
          {vehicle.transmission ? (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Settings2 className="size-3" aria-hidden="true" />
              {vehicle.transmission}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {vehicle.mileage != null ? (
            <span className="inline-flex items-center gap-1">
              <Gauge className="size-3.5" aria-hidden="true" />
              {mileageLabel}
            </span>
          ) : null}
          {vehicle.seating_capacity != null ? (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden="true" />
              {vehicle.seating_capacity} seats
            </span>
          ) : null}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href={`/vehicles/${vehicle.id}`} />}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
