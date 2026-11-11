import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { VehicleCardSkeleton } from "@/components/vehicles/VehicleCardSkeleton";
import { cn } from "@/lib/utils";

const GRID = "grid gap-5 sm:grid-cols-2 xl:grid-cols-3";

export function VehicleGrid({
  vehicles = [],
  loading = false,
  skeletonCount = 6,
  className,
}) {
  if (loading) {
    return (
      <div
        className={cn(GRID, className)}
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
    <div className={cn(GRID, className)}>
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </div>
  );
}
