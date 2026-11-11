"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Car, Fuel, IndianRupee, Plus } from "lucide-react";
import { DashboardCard } from "@/components/admin/DashboardCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { getAdminDashboardStats } from "@/lib/api";
import { formatPrice, vehicleTitle } from "@/lib/format";

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

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

  const header = (
    <PageHeader
      size="compact"
      title="Dashboard"
      description="Live statistics from the vehicle catalog."
      actions={
        <Button nativeButton={false} render={<Link href="/admin/vehicles/new" />}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Add vehicle
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <div className="space-y-8">
        {header}
        <DashboardSkeleton />
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-8">
        {header}
        <ErrorState
          title="Could not load dashboard"
          description={error}
          onRetry={loadStats}
        />
      </div>
    );
  }

  const cards = [
    {
      title: "Total vehicles",
      value: stats.total_vehicles,
      description: "Listed in the catalog",
      icon: Car,
    },
    {
      title: "Brands",
      value: stats.total_brands,
      description: "Distinct manufacturers",
      icon: Building2,
    },
    {
      title: "Average price",
      value: formatPrice(stats.price_stats.average),
      description: `Range ${formatPrice(stats.price_stats.minimum)} – ${formatPrice(
        stats.price_stats.maximum
      )}`,
      icon: IndianRupee,
    },
    {
      title: "Fuel types",
      value: stats.counts_by_fuel_type.length,
      description: "Active fuel categories",
      icon: Fuel,
    },
  ];

  return (
    <div className="space-y-8">
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((stat) => (
          <DashboardCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DistributionCard title="Fuel distribution" items={stats.counts_by_fuel_type} />
        <DistributionCard title="Transmission" items={stats.counts_by_transmission} />
        <DistributionCard title="Vehicle types" items={stats.counts_by_vehicle_type} />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-heading text-base font-bold">Recently added</h2>
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2"
            nativeButton={false}
            render={<Link href="/admin/vehicles" />}
          >
            Manage vehicles
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
        {stats.recently_added.length === 0 ? (
          <EmptyState
            className="m-5"
            title="No vehicles yet"
            description="Add a vehicle to populate the dashboard."
          />
        ) : (
          <ul className="divide-y divide-border">
            {stats.recently_added.map((vehicle) => (
              <li key={vehicle.id}>
                <Link
                  href={`/admin/vehicles/${vehicle.id}/edit`}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-secondary/50"
                >
                  <VehicleImage
                    src={vehicle.image_url}
                    alt=""
                    aspect={null}
                    className="h-11 w-16 shrink-0 rounded-md"
                    iconClassName="size-5"
                    showFallbackLabel={false}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{vehicleTitle(vehicle)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[vehicle.fuel_type, vehicle.transmission, vehicle.vehicle_type]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <p className="shrink-0 font-heading text-sm font-bold tabular">
                    {formatPrice(vehicle.price)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DistributionCard({ title, items }) {
  const total = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const sorted = [...items].sort((a, b) => b.count - a.count);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-base font-bold">{title}</h2>
        {total > 0 ? (
          <span className="text-xs text-muted-foreground tabular">{total} total</span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data available.</p>
      ) : (
        <ul className="space-y-3.5">
          {sorted.map((item) => {
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <li key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 font-medium tabular">
                    {item.count}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {Math.round(pct)}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
