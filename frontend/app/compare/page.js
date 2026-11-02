"use client";

import { useMemo, useState } from "react";
import { ComparisonTable } from "@/components/compare/ComparisonTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLACEHOLDER_VEHICLES, formatPrice } from "@/lib/placeholder-data";

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState([1, 2]);

  const selectedVehicles = useMemo(
    () =>
      PLACEHOLDER_VEHICLES.filter((vehicle) =>
        selectedIds.includes(vehicle.id)
      ),
    [selectedIds]
  );

  function toggleVehicle(id) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, id];
    });
  }

  return (
    <div className="page-container space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Compare</h1>
        <p className="mt-1 text-muted-foreground">
          Select up to 3 vehicles to compare side by side.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Vehicles</CardTitle>
          <CardDescription>
            {selectedIds.length} of 3 selected
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {PLACEHOLDER_VEHICLES.map((vehicle) => {
            const selected = selectedIds.includes(vehicle.id);
            return (
              <Button
                key={vehicle.id}
                variant={selected ? "default" : "outline"}
                onClick={() => toggleVehicle(vehicle.id)}
              >
                {vehicle.brand} {vehicle.model}
                <Badge variant="secondary" className="ml-2">
                  {formatPrice(vehicle.price)}
                </Badge>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparison Table</CardTitle>
        </CardHeader>
        <CardContent>
          <ComparisonTable vehicles={selectedVehicles} />
        </CardContent>
      </Card>
    </div>
  );
}
