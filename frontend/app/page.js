"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Car,
  GitCompareArrows,
  Lightbulb,
  Search,
  Sparkles,
} from "lucide-react";
import { HomeSearch } from "@/components/home/HomeSearch";
import { VehicleCategoryCard } from "@/components/home/VehicleCategoryCard";
import { VehicleGrid } from "@/components/vehicles/VehicleGrid";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { getVehicles } from "@/lib/api";

const CATEGORIES = [
  {
    label: "Hatchback",
    description: "Compact cars for city driving",
    href: "/vehicles?vehicle_type=Hatchback",
  },
  {
    label: "Sedan",
    description: "Comfortable everyday saloons",
    href: "/vehicles?vehicle_type=Sedan",
  },
  {
    label: "SUV",
    description: "Space and road presence",
    href: "/vehicles?vehicle_type=SUV",
  },
  {
    label: "MUV",
    description: "Family-friendly multi-utility",
    href: "/vehicles?vehicle_type=MUV",
  },
  {
    label: "Electric",
    description: "Zero-emission EV options",
    href: "/vehicles?fuel_type=Electric",
  },
];

const WHY_CHOOSE = [
  {
    icon: Search,
    title: "Requirement discovery",
    description:
      "Capture budget, fuel preference, body type, and other constraints so you start from clear buying criteria.",
  },
  {
    icon: Sparkles,
    title: "Intelligent recommendations",
    description:
      "Planned AI ranking will score vehicles against your priorities (mileage, safety, seating, and more) once the recommendation engine is fully wired.",
  },
  {
    icon: GitCompareArrows,
    title: "Side-by-side comparison",
    description:
      "Compare shortlisted models on price, efficiency, and key specs so trade-offs are easy to see.",
  },
  {
    icon: Lightbulb,
    title: "Thoughtful alternatives",
    description:
      "When an exact match is scarce, upcoming recommendation flows will surface nearby alternatives within similar budgets and categories.",
  },
];

const FEATURED_LIMIT = 6;

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [snapshot, setSnapshot] = useState({
    key: null,
    error: null,
  });

  const loading = snapshot.key !== fetchKey;
  const error = snapshot.key === fetchKey ? snapshot.error : null;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const key = fetchKey;

    getVehicles(
      { limit: FEATURED_LIMIT, page: 1 },
      { signal: controller.signal }
    )
      .then((data) => {
        if (!active) return;
        setFeatured(Array.isArray(data?.items) ? data.items : []);
        setSnapshot({ key, error: null });
      })
      .catch((err) => {
        if (!active || err?.name === "AbortError") return;
        setFeatured([]);
        setSnapshot({
          key,
          error: err?.message || "Failed to load featured vehicles.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchKey]);

  function handleRetry() {
    setFetchKey((key) => key + 1);
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-slate-50 via-white to-background">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="page-container relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              VehicleAI
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Find the Right Vehicle for Your Needs
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Explore a curated catalog, filter by what matters to you, compare
              options side by side, and use AI-assisted recommendations to
              narrow down the best fit for your budget and lifestyle.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="gap-2"
                nativeButton={false}
                render={<Link href="/vehicles" />}
              >
                Explore Vehicles
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                nativeButton={false}
                render={<Link href="/recommendations" />}
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Get AI Recommendations
              </Button>
            </div>
          </div>

          <div
            className="relative flex min-h-[240px] items-center justify-center rounded-2xl border border-border/80 bg-gradient-to-br from-slate-100 via-slate-50 to-primary/10 shadow-sm sm:min-h-[320px]"
            aria-hidden="true"
          >
            <div className="absolute inset-6 rounded-xl border border-dashed border-slate-300/80" />
            <div className="relative flex flex-col items-center gap-3 text-slate-500">
              <span className="flex size-20 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-border">
                <Car className="size-10 text-primary" />
              </span>
              <span className="text-sm font-medium tracking-wide">
                Smart vehicle discovery
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="page-container section-y">
        <HomeSearch />
      </section>

      {/* Categories */}
      <section className="border-y border-border bg-slate-50/70">
        <div className="page-container section-y space-y-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Browse by category
            </h2>
            <p className="mt-1 text-muted-foreground">
              Jump straight into body types or electric vehicles.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CATEGORIES.map((category) => (
              <VehicleCategoryCard key={category.label} {...category} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="page-container section-y space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured vehicles
            </h2>
            <p className="mt-1 text-muted-foreground">
              Latest listings from the live catalog.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 self-start sm:self-auto"
            nativeButton={false}
            render={<Link href="/vehicles" />}
          >
            View All
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {error ? (
          <ErrorState
            title="Could not load featured vehicles"
            description={error}
            onRetry={handleRetry}
          />
        ) : loading ? (
          <VehicleGrid loading skeletonCount={FEATURED_LIMIT} />
        ) : featured.length === 0 ? (
          <EmptyState
            title="No vehicles to feature yet"
            description="Once vehicles are added to the catalog, they will appear here."
            action={
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/vehicles" />}
              >
                Explore Vehicles
              </Button>
            }
          />
        ) : (
          <VehicleGrid vehicles={featured} />
        )}
      </section>

      {/* Why choose */}
      <section className="border-y border-border bg-white">
        <div className="page-container section-y space-y-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Why Choose VehicleAI
            </h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Capabilities available today and planned for upcoming phases —
              described honestly, without overselling unfinished AI flows.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {WHY_CHOOSE.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-xl border border-border/80 bg-slate-50/50 p-5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="page-container section-y">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/90 px-6 py-10 text-primary-foreground shadow-sm sm:flex-row sm:items-center sm:px-10">
          <div className="max-w-xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready for smarter recommendations?
            </h2>
            <p className="text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
              Tell us your budget and preferences — the recommendations page
              will guide you toward vehicles that fit.
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            className="gap-2 shrink-0"
            nativeButton={false}
            render={<Link href="/recommendations" />}
          >
            Get AI Recommendations
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </section>
    </div>
  );
}
