import Link from "next/link";
import { formatINR, formatMileage, vehicleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";

function withUnit(value, unit) {
  if (value === undefined || value === null || value === "") return null;
  return `${value} ${unit}`;
}

const GROUPS = [
  {
    title: "Overview",
    rows: [
      { key: "price", label: "Price", get: (v) => (v.price != null ? formatINR(v.price) : null) },
      { key: "vehicle_type", label: "Body type", get: (v) => v.vehicle_type },
      { key: "variant", label: "Variant", get: (v) => v.variant },
    ],
  },
  {
    title: "Efficiency and powertrain",
    rows: [
      { key: "mileage", label: "Mileage", get: (v) => formatMileage(v) },
      { key: "fuel_type", label: "Fuel", get: (v) => v.fuel_type },
      { key: "transmission", label: "Transmission", get: (v) => v.transmission },
      { key: "engine", label: "Engine", get: (v) => v.engine },
      { key: "power", label: "Power", get: (v) => v.power },
      { key: "torque", label: "Torque", get: (v) => v.torque },
    ],
  },
  {
    title: "Practicality and safety",
    rows: [
      { key: "seating_capacity", label: "Seating", get: (v) => withUnit(v.seating_capacity, "seats") },
      { key: "boot_space", label: "Boot space", get: (v) => withUnit(v.boot_space, "L") },
      { key: "safety_rating", label: "Safety rating", get: (v) => withUnit(v.safety_rating, "/ 5") },
    ],
  },
];

function normalize(value) {
  return value == null || value === "" ? "" : String(value).trim().toLowerCase();
}

/**
 * Grouped side-by-side spec table. Rows whose values differ across vehicles
 * are tinted when `highlightDifferences` is on (needs 2+ vehicles).
 */
export function ComparisonTable({ vehicles, highlightDifferences = true }) {
  if (!vehicles?.length) return null;

  const canDiff = vehicles.length > 1;
  const colWidth = "min-w-[180px] sm:min-w-[220px]";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Specification comparison of {vehicles.map((v) => vehicleTitle(v)).join(", ")}
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 z-10 w-32 min-w-32 bg-card px-4 py-4 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:w-48 sm:min-w-48 sm:px-5"
              >
                Specification
              </th>
              {vehicles.map((vehicle) => (
                <th
                  key={vehicle.id}
                  scope="col"
                  className={cn("px-4 py-4 text-left align-bottom sm:px-5", colWidth)}
                >
                  <span className="block text-xs font-medium text-muted-foreground">
                    {vehicle.brand}
                  </span>
                  <Link
                    href={`/vehicles/${vehicle.id}`}
                    className="font-heading text-base font-bold text-foreground hover:text-primary"
                  >
                    {vehicle.model || vehicleTitle(vehicle)}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          {GROUPS.map((group) => (
            <tbody key={group.title}>
              <tr className="border-b border-border bg-secondary/70">
                <th
                  scope="colgroup"
                  colSpan={vehicles.length + 1}
                  className="px-4 py-2.5 text-left sm:px-5"
                >
                  <span className="sticky left-4 inline-block font-heading text-sm font-bold text-foreground sm:left-5">
                    {group.title}
                  </span>
                </th>
              </tr>
              {group.rows.map((row) => {
                const values = vehicles.map((vehicle) => row.get(vehicle));
                const differs =
                  highlightDifferences && canDiff && new Set(values.map(normalize)).size > 1;

                return (
                  <tr
                    key={row.key}
                    className={cn(
                      "border-b border-border last:border-0",
                      differs && "bg-sage/55"
                    )}
                  >
                    <th
                      scope="row"
                      className={cn(
                        "sticky left-0 z-10 px-4 py-3.5 text-left align-top font-medium text-muted-foreground sm:px-5",
                        differs ? "bg-[color-mix(in_oklch,var(--sage)_55%,var(--card))]" : "bg-card"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {row.label}
                        {differs ? (
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        ) : null}
                        {differs ? <span className="sr-only">(differs)</span> : null}
                      </span>
                    </th>
                    {values.map((value, index) => (
                      <td
                        key={`${vehicles[index].id}-${row.key}`}
                        className={cn(
                          "px-4 py-3.5 align-top sm:px-5",
                          colWidth,
                          value == null || value === ""
                            ? "text-muted-foreground"
                            : "font-medium text-foreground tabular"
                        )}
                      >
                        {value == null || value === "" ? "Not available" : value}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
