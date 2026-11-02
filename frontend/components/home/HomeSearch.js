"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Quick search that navigates to /vehicles with backend-supported query params.
 *
 * Backend filter limitation: GET /api/vehicles supports exact `brand` matching
 * only — there is no `model` or free-text search param. The model field is kept
 * for UX and appended as a client-side hint in the URL for display, but only
 * `brand` is applied by the API. Model filtering will need a backend change.
 */
export function HomeSearch() {
  const router = useRouter();

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const brand = String(formData.get("brand") || "").trim();
    const model = String(formData.get("model") || "").trim();
    const budget = String(formData.get("budget") || "").trim();
    const fuelType = String(formData.get("fuel_type") || "").trim();
    const vehicleType = String(formData.get("vehicle_type") || "").trim();

    // Backend: brand = case-insensitive exact match (no model filter)
    if (brand) params.set("brand", brand);
    // Client-only hint — not consumed by the current backend API
    if (model) params.set("model", model);
    if (budget) params.set("max_price", budget);
    if (fuelType) params.set("fuel_type", fuelType);
    if (vehicleType) params.set("vehicle_type", vehicleType);

    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `/vehicles?${qs}` : "/vehicles");
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Quick vehicle search</CardTitle>
        <CardDescription>
          Filter by brand, budget, fuel, and body type. Results open on Explore
          Vehicles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="grid gap-2">
            <Label htmlFor="home-brand">Brand</Label>
            <Input
              id="home-brand"
              name="brand"
              placeholder="e.g. Hyundai"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="home-model">
              Model{" "}
              <span className="font-normal text-muted-foreground">
                (display only)
              </span>
            </Label>
            <Input
              id="home-model"
              name="model"
              placeholder="e.g. Creta"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Backend currently filters by brand only — model search needs an
              API update.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="home-budget">Max budget (₹)</Label>
            <Input
              id="home-budget"
              name="budget"
              type="number"
              min="0"
              step="1000"
              placeholder="e.g. 1500000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="home-fuel">Fuel type</Label>
            <select
              id="home-fuel"
              name="fuel_type"
              defaultValue=""
              className={selectClassName}
            >
              <option value="">Any</option>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="home-type">Vehicle type</Label>
            <select
              id="home-type"
              name="vehicle_type"
              defaultValue=""
              className={selectClassName}
            >
              <option value="">Any</option>
              <option value="Hatchback">Hatchback</option>
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="MUV">MUV</option>
              <option value="Coupe">Coupe</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" size="lg" className="w-full gap-2">
              <Search className="size-4" aria-hidden="true" />
              Search vehicles
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
