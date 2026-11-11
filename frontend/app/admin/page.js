"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Car, Fuel, IndianRupee, Plus } from "lucide-react";
import { DashboardCard } from "@/components/admin/DashboardCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { getAdminDashboardStats } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      setStats(await getAdminDashboardStats());
    } catch (err) {
      setError(err?.message || "Unable to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    getAdminDashboardStats()
      .then((data) => {
        if (!ignore) setStats(data);
      })
      .catch((err) => {
        if (!ignore) setError(err?.message || "Unable to load dashboard statistics");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;
  if (error) return <ErrorState description={error} onRetry={loadStats} />;

  const cards = [
    {
      title: "Total Vehicles",
      value: stats.total_vehicles,
      description: "Vehicles in PostgreSQL",
      icon: Car,
    },
    {
      title: "Total Brands",
      value: stats.total_brands,
      description: "Distinct brands",
      icon: Building2,
    },
    {
      title: "Average Price",
      value: formatPrice(stats.price_stats.average),
      description: `Range ${formatPrice(stats.price_stats.minimum)} - ${formatPrice(
        stats.price_stats.maximum
      )}`,
      icon: IndianRupee,
    },
    {
      title: "Fuel Types",
      value: stats.counts_by_fuel_type.length,
      description: "Active fuel categories",
      icon: Fuel,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Live vehicle catalog statistics and quick actions.
          </p>
        </div>
        <Link href="/admin/vehicles/new">
          <Button>
            <Plus data-icon="inline-start" />
            Quick Add Vehicle
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => (
          <DashboardCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DistributionCard title="Fuel Distribution" items={stats.counts_by_fuel_type} />
        <DistributionCard title="Transmission" items={stats.counts_by_transmission} />
        <DistributionCard title="Vehicle Types" items={stats.counts_by_vehicle_type} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recently Added Vehicles</CardTitle>
          <Link href="/admin/vehicles">
            <Button variant="outline" size="sm">Manage Vehicles</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recently_added.length === 0 ? (
            <EmptyState title="No vehicles yet" description="Add a vehicle to populate the dashboard." />
          ) : (
            <div className="divide-y rounded-lg border">
              {stats.recently_added.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <p className="font-medium">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.fuel_type} / {vehicle.transmission} / {vehicle.vehicle_type}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatPrice(vehicle.price)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DistributionCard({ title, items }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          items.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3">
              <span className="text-sm">{item.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {item.count}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
