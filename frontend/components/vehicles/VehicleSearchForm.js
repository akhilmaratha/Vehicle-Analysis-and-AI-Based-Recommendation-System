"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const defaultValues = {
  budget: "1500000",
  fuel_type: "Petrol",
  transmission: "Automatic",
  vehicle_type: "SUV",
  minimum_mileage: "15",
  seating_capacity: "5",
  safety_priority: "High",
  mileage_priority: "High",
};

export function VehicleSearchForm({ onSubmit, message }) {
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      budget: Number(formData.get("budget")),
      fuel_type: formData.get("fuel_type"),
      transmission: formData.get("transmission"),
      vehicle_type: formData.get("vehicle_type"),
      minimum_mileage: Number(formData.get("minimum_mileage")),
      seating_capacity: Number(formData.get("seating_capacity")),
      safety_priority: formData.get("safety_priority"),
      mileage_priority: formData.get("mileage_priority"),
    };
    onSubmit?.(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find Your Vehicle</CardTitle>
        <CardDescription>
          Enter your preferences. AI recommendations will be wired in a later
          phase.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="budget">Budget (₹)</Label>
            <Input
              id="budget"
              name="budget"
              type="number"
              defaultValue={defaultValues.budget}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fuel_type">Fuel Type</Label>
            <select
              id="fuel_type"
              name="fuel_type"
              defaultValue={defaultValues.fuel_type}
              className={selectClassName}
            >
              <option>Petrol</option>
              <option>Diesel</option>
              <option>Hybrid</option>
              <option>Electric</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transmission">Transmission</Label>
            <select
              id="transmission"
              name="transmission"
              defaultValue={defaultValues.transmission}
              className={selectClassName}
            >
              <option>Automatic</option>
              <option>Manual</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vehicle_type">Vehicle Type</Label>
            <select
              id="vehicle_type"
              name="vehicle_type"
              defaultValue={defaultValues.vehicle_type}
              className={selectClassName}
            >
              <option>SUV</option>
              <option>Sedan</option>
              <option>Hatchback</option>
              <option>MUV</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="minimum_mileage">Minimum Mileage (km/l)</Label>
            <Input
              id="minimum_mileage"
              name="minimum_mileage"
              type="number"
              defaultValue={defaultValues.minimum_mileage}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seating_capacity">Seating Capacity</Label>
            <Input
              id="seating_capacity"
              name="seating_capacity"
              type="number"
              defaultValue={defaultValues.seating_capacity}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="safety_priority">Safety Priority</Label>
            <select
              id="safety_priority"
              name="safety_priority"
              defaultValue={defaultValues.safety_priority}
              className={selectClassName}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mileage_priority">Mileage Priority</Label>
            <select
              id="mileage_priority"
              name="mileage_priority"
              defaultValue={defaultValues.mileage_priority}
              className={selectClassName}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg">
            Find My Vehicle
          </Button>
          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  );
}
