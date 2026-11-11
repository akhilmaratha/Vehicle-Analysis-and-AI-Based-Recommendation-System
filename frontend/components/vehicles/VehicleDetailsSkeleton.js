import { Skeleton } from "@/components/ui/skeleton";

export function VehicleDetailsSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading vehicle details">
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
        <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
        <div className="space-y-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
