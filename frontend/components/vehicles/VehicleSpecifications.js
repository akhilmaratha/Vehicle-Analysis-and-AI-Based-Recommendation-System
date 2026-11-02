import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const UNAVAILABLE = "Not available";

function displayValue(value, formatter) {
  if (value === undefined || value === null || value === "") {
    return UNAVAILABLE;
  }
  if (typeof formatter === "function") {
    return formatter(value);
  }
  return String(value);
}

/**
 * Spec grid from API vehicle fields only.
 * Missing values render as "Not available".
 */
export function VehicleSpecifications({ vehicle, className }) {
  if (!vehicle) return null;

  const mileageUnit =
    vehicle.fuel_type === "Electric" ? "km/charge" : "km/l";

  const rows = [
    { label: "Fuel type", value: displayValue(vehicle.fuel_type) },
    { label: "Transmission", value: displayValue(vehicle.transmission) },
    {
      label: "Mileage",
      value: displayValue(vehicle.mileage, (v) => `${v} ${mileageUnit}`),
    },
    { label: "Engine", value: displayValue(vehicle.engine) },
    { label: "Power", value: displayValue(vehicle.power) },
    { label: "Torque", value: displayValue(vehicle.torque) },
    {
      label: "Seating",
      value: displayValue(vehicle.seating_capacity, (v) => `${v} seats`),
    },
    {
      label: "Boot space",
      value: displayValue(vehicle.boot_space, (v) => `${v} L`),
    },
    {
      label: "Safety rating",
      value: displayValue(vehicle.safety_rating, (v) => `${v} / 5`),
    },
  ];

  return (
    <Card className={cn("border-border/80 shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Specifications</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const missing = row.value === UNAVAILABLE;
            return (
              <div
                key={row.label}
                className="rounded-lg border border-border/70 bg-slate-50/60 px-3 py-2.5"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd
                  className={cn(
                    "mt-1 text-sm font-medium",
                    missing ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {row.value}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
