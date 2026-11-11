import { SpecificationItem } from "@/components/vehicles/SpecificationItem";
import { formatMileage } from "@/lib/format";
import { cn } from "@/lib/utils";

function withUnit(value, unit) {
  if (value === undefined || value === null || value === "") return null;
  return `${value} ${unit}`;
}

/**
 * Grouped technical specifications from API vehicle fields only.
 * Missing values render as "Not available".
 */
export function VehicleSpecifications({ vehicle, className }) {
  if (!vehicle) return null;

  const groups = [
    {
      title: "Powertrain",
      rows: [
        { label: "Engine", value: vehicle.engine },
        { label: "Power", value: vehicle.power },
        { label: "Torque", value: vehicle.torque },
        { label: "Fuel type", value: vehicle.fuel_type },
        { label: "Transmission", value: vehicle.transmission },
        { label: "Mileage", value: formatMileage(vehicle) },
      ],
    },
    {
      title: "Practicality",
      rows: [
        { label: "Body type", value: vehicle.vehicle_type },
        { label: "Seating", value: withUnit(vehicle.seating_capacity, "seats") },
        { label: "Boot space", value: withUnit(vehicle.boot_space, "L") },
      ],
    },
    {
      title: "Safety",
      rows: [
        { label: "Safety rating", value: withUnit(vehicle.safety_rating, "/ 5") },
      ],
    },
  ];

  return (
    <div className={cn("divide-y divide-border rounded-xl border border-border bg-card", className)}>
      {groups.map((group) => (
        <section
          key={group.title}
          className="grid gap-5 p-5 sm:p-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8"
        >
          <h3 className="font-heading text-base font-bold">{group.title}</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {group.rows.map((row) => (
              <SpecificationItem key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
