import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SkeletonPulse({ className }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
    />
  );
}

export function VehicleCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <SkeletonPulse className="h-40 rounded-none" />
      <CardHeader className="gap-2 pb-2">
        <SkeletonPulse className="h-5 w-3/4" />
        <SkeletonPulse className="h-4 w-1/2" />
        <SkeletonPulse className="mt-1 h-6 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <div className="flex gap-2">
          <SkeletonPulse className="h-5 w-16 rounded-full" />
          <SkeletonPulse className="h-5 w-20 rounded-full" />
        </div>
        <SkeletonPulse className="h-3 w-2/3" />
      </CardContent>
      <CardFooter>
        <SkeletonPulse className="h-8 w-full" />
      </CardFooter>
    </Card>
  );
}
