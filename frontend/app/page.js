import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeSearch } from "@/components/home/HomeSearch";
import { FeaturedVehicles } from "@/components/home/FeaturedVehicles";
import { VehicleCategoryCard } from "@/components/home/VehicleCategoryCard";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Button } from "@/components/ui/button";
import heroImage from "@/public/images/hero-car.jpg";

const CATEGORIES = [
  {
    label: "Hatchback",
    description: "Easy to park, light on fuel, made for the city.",
    href: "/vehicles?vehicle_type=Hatchback",
  },
  {
    label: "Sedan",
    description: "Comfortable, composed and roomy for long drives.",
    href: "/vehicles?vehicle_type=Sedan",
  },
  {
    label: "SUV",
    description: "Higher seating, more space and confident road presence.",
    href: "/vehicles?vehicle_type=SUV",
  },
  {
    label: "MUV",
    description: "Room for the whole family and their luggage.",
    href: "/vehicles?vehicle_type=MUV",
  },
  {
    label: "Electric",
    description: "Quiet, efficient and zero tailpipe emissions.",
    href: "/vehicles?fuel_type=Electric",
  },
];

const PRINCIPLES = [
  {
    title: "A real catalog, honestly described",
    description:
      "Every listing comes from the live catalog. When a specification has not been recorded, we say so instead of guessing.",
  },
  {
    title: "Filters that match how you shop",
    description:
      "Narrow down by brand, budget, fuel, transmission, body type, mileage and seating — the details that actually decide a purchase.",
  },
  {
    title: "Side-by-side, without the spreadsheet",
    description:
      "Shortlist up to three vehicles and see price, efficiency, power and practicality in one view, with differences highlighted.",
  },
  {
    title: "Recommendations you can read",
    description:
      "Every suggestion shows how it was scored and why it fits, along with the compromises worth knowing before you decide.",
  },
];

const STEPS = [
  {
    title: "Tell us what you need",
    description:
      "Describe it in your own words or use a short form. We turn your description into budget, fuel, type and priorities, and you confirm or correct them.",
  },
  {
    title: "We filter, then rank",
    description:
      "Vehicles outside your firm requirements are set aside. The rest are scored against your priorities and how closely they match your preferences.",
  },
  {
    title: "You see the reasoning",
    description:
      "Each recommendation comes with its scores, its main advantages and its potential compromises, plus nearby alternatives worth a look.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="overflow-hidden">
        <div className="page-container grid items-center gap-10 pt-10 pb-12 sm:pt-14 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:pt-20 lg:pb-16">
          <div className="space-y-7">
            <p className="eyebrow">Vehicle discovery, made personal</p>
            <h1 className="font-heading text-[2.6rem] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl lg:text-[4.5rem]">
              Find a car that fits your life.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              Explore vehicles, compare the details, and discover the right
              match for your budget and everyday needs.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" nativeButton={false} render={<Link href="/vehicles" />}>
                Explore vehicles
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="/recommendations" />}
              >
                Get recommendations
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sage">
              <Image
                src={heroImage}
                alt="A dark green compact SUV parked on a quiet tree-lined street in warm evening light"
                fill
                preload
                placeholder="blur"
                sizes="(min-width: 1280px) 600px, (min-width: 1024px) 48vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick search */}
      <section className="page-container pb-16 sm:pb-20" aria-labelledby="quick-search-heading">
        <h2 id="quick-search-heading" className="mb-4 font-heading text-lg font-bold">
          Start with the basics
        </h2>
        <HomeSearch />
      </section>

      {/* Featured */}
      <section className="border-t border-border bg-surface/60">
        <div className="page-container section-y space-y-10">
          <SectionHeading
            eyebrow="Latest arrivals"
            title="Recently added to the catalog"
            description="The newest listings, straight from the live inventory."
            action={
              <Button variant="outline" nativeButton={false} render={<Link href="/vehicles" />}>
                View all vehicles
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            }
          />
          <FeaturedVehicles />
        </div>
      </section>

      {/* Categories */}
      <section className="page-container section-y space-y-10">
        <SectionHeading
          eyebrow="Browse by type"
          title="Start from the shape of your day"
          description="Pick a body style or go electric, then refine from there."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORIES.map((category, index) => (
            <VehicleCategoryCard key={category.label} index={index + 1} {...category} />
          ))}
        </div>
      </section>

      {/* Why VehicleAI */}
      <section className="border-y border-border bg-card">
        <div className="page-container section-y grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow="Why VehicleAI"
            title="Less noise. Clearer decisions."
            description="Buying a car is a big decision. We keep the information honest and the tools simple, so you can focus on what matters to you."
          />
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {PRINCIPLES.map((item) => (
              <div key={item.title} className="space-y-2 border-t-2 border-primary pt-5">
                <dt className="font-heading text-lg font-bold">{item.title}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How recommendations work */}
      <section className="page-container section-y space-y-12">
        <SectionHeading
          eyebrow="How recommendations work"
          title="Three steps from a sentence to a shortlist"
        />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="space-y-4">
              <span className="font-heading text-5xl font-extrabold text-primary/20 tabular">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-heading text-xl font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* AI recommendation CTA */}
      <section className="page-container pb-16 sm:pb-20">
        <div className="grid gap-8 overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-14 lg:grid-cols-[1.3fr_auto] lg:items-center">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-sage uppercase">
              Personal recommendations
            </p>
            <h2 className="font-heading text-3xl font-bold text-balance text-primary-foreground sm:text-4xl">
              Not sure where to start? Describe your ideal car.
            </h2>
            <p className="text-base leading-relaxed text-primary-foreground/75">
              Try something like &ldquo;An SUV under ₹15 lakh, automatic, with
              good mileage and safety.&rdquo; We will confirm the details with
              you before ranking a shortlist.
            </p>
          </div>
          <Button
            size="lg"
            variant="inverse"
            nativeButton={false}
            render={<Link href="/recommendations" />}
          >
            Get recommendations
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </section>

      {/* Final discovery CTA */}
      <section className="border-t border-border">
        <div className="page-container flex flex-col items-start gap-6 py-16 sm:py-20 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-heading text-3xl font-bold text-balance sm:text-4xl">
              Ready to look around?
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Browse the full catalog at your own pace, then shortlist a few to
              compare side by side.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" nativeButton={false} render={<Link href="/vehicles" />}>
              Explore vehicles
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/compare" />}
            >
              Open compare
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
