"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLACEHOLDER_VEHICLES, formatPrice } from "@/lib/placeholder-data";

export default function AdminVehiclesPage() {
  function handlePlaceholderAction(action, vehicle) {
    const label = vehicle
      ? `${action}: ${vehicle.brand} ${vehicle.model}`
      : action;
    window.alert(`${label} — functionality will be connected later.`);
  }

  return (
    <div className="page-container space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Manage Vehicles
          </h1>
          <p className="mt-1 text-muted-foreground">
            Basic vehicle management interface (actions are placeholders).
          </p>
        </div>
        <Button onClick={() => handlePlaceholderAction("Add Vehicle")}>
          <Plus data-icon="inline-start" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Table</CardTitle>
          <CardDescription>
            Showing placeholder data until admin CRUD is fully wired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Fuel</TableHead>
                <TableHead>Transmission</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PLACEHOLDER_VEHICLES.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>{vehicle.id}</TableCell>
                  <TableCell>{vehicle.brand}</TableCell>
                  <TableCell>{vehicle.model}</TableCell>
                  <TableCell>{formatPrice(vehicle.price)}</TableCell>
                  <TableCell>{vehicle.fuel_type}</TableCell>
                  <TableCell>{vehicle.transmission}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePlaceholderAction("Edit", vehicle)}
                    >
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handlePlaceholderAction("Delete", vehicle)}
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
