import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Pulse({ className }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
    />
  );
}

export function VehicleDetailsSkeleton() {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      aria-label="Loading vehicle details"
    >
      <div className="space-y-3">
        <Pulse className="h-4 w-28" />
        <Pulse className="h-9 w-2/3 max-w-md" />
        <Pulse className="h-5 w-40" />
        <Pulse className="h-8 w-36" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Pulse className="aspect-video w-full rounded-xl" />
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <Pulse className="h-6 w-40" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Pulse key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>

      <Pulse className="h-28 w-full rounded-xl" />
      <div className="flex flex-wrap gap-3">
        <Pulse className="h-9 w-36" />
        <Pulse className="h-9 w-40" />
        <Pulse className="h-9 w-44" />
      </div>
    </div>
  );
}
