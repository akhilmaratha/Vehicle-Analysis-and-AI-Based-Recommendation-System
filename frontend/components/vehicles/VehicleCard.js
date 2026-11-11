import Link from "next/link";
import { ArrowUpRight, Fuel, Gauge, Settings2, Users } from "lucide-react";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { PriceDisplay } from "@/components/vehicles/PriceDisplay";
import { SpecificationItem } from "@/components/vehicles/SpecificationItem";
import { formatMileage, vehicleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";

export function VehicleCard({ vehicle, className }) {
  const title = vehicleTitle(vehicle, "Untitled vehicle");
  const href = `/vehicles/${vehicle.id}`;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-[border-color,box-shadow] duration-200 hover:border-foreground/20 hover:shadow-[0_10px_30px_-18px_rgba(36,39,32,0.35)]",
        className
      )}
    >
      <div className="relative">
        <VehicleImage
          src={vehicle.image_url}
          alt={title}
          aspect="card"
          iconClassName="size-12"
          showFallbackLabel={false}
          imageClassName="group-hover:scale-[1.03]"
        />
        {vehicle.vehicle_type ? (
          <span className="absolute top-3 left-3 rounded-md bg-card/95 px-2 py-1 text-xs font-medium text-foreground">
            {vehicle.vehicle_type}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {vehicle.brand ? (
              <p className="text-xs font-medium text-muted-foreground">{vehicle.brand}</p>
            ) : null}
            <h3 className="mt-0.5 font-heading text-lg leading-snug font-bold">
              <Link
                href={href}
                className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
              >
                {vehicle.model || title}
              </Link>
            </h3>
            {vehicle.variant ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{vehicle.variant}</p>
            ) : null}
          </div>
          <PriceDisplay price={vehicle.price} size="sm" className="shrink-0 text-right" />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border pt-4">
          <SpecificationItem variant="inline" icon={Fuel} label="Fuel" value={vehicle.fuel_type} />
          <SpecificationItem
            variant="inline"
            icon={Settings2}
            label="Transmission"
            value={vehicle.transmission}
          />
          <SpecificationItem
            variant="inline"
            icon={Gauge}
            label="Mileage"
            value={formatMileage(vehicle)}
          />
          <SpecificationItem
            variant="inline"
            icon={Users}
            label="Seating"
            value={vehicle.seating_capacity != null ? `${vehicle.seating_capacity} seats` : null}
          />
        </dl>

        <div className="mt-auto flex items-center justify-between pt-1 text-sm font-semibold text-primary">
          <span>View details</span>
          <ArrowUpRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </div>
      </div>
    </article>
  );
}
