import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/placeholder-data";

const rows = [
  { key: "price", label: "Price", format: formatPrice },
  { key: "mileage", label: "Mileage", format: (v) => (v != null ? `${v} km/l` : "—") },
  { key: "fuel_type", label: "Fuel" },
  { key: "transmission", label: "Transmission" },
  { key: "engine", label: "Engine" },
  { key: "safety_rating", label: "Safety" },
  { key: "seating_capacity", label: "Seating" },
  { key: "boot_space", label: "Boot Space" },
];

export function ComparisonTable({ vehicles }) {
  if (!vehicles?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Select up to 3 vehicles to compare.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Spec</TableHead>
          {vehicles.map((vehicle) => (
            <TableHead key={vehicle.id}>
              {vehicle.brand} {vehicle.model}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="font-medium">{row.label}</TableCell>
            {vehicles.map((vehicle) => (
              <TableCell key={`${vehicle.id}-${row.key}`}>
                {row.format
                  ? row.format(vehicle[row.key])
                  : vehicle[row.key] ?? "—"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
