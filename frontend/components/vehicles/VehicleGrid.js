import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { VehicleCardSkeleton } from "@/components/vehicles/VehicleCardSkeleton";
import { cn } from "@/lib/utils";

export function VehicleGrid({
  vehicles = [],
  loading = false,
  skeletonCount = 6,
  className,
}) {
  if (loading) {
    return (
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
          className
        )}
        aria-busy="true"
        aria-label="Loading vehicles"
      >
        {Array.from({ length: skeletonCount }, (_, index) => (
          <VehicleCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </div>
  );
}
