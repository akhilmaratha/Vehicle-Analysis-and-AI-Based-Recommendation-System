import Link from "next/link";
import { Car } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/vehicles", label: "Explore Vehicles" },
  { href: "/compare", label: "Compare" },
  { href: "/recommendations", label: "AI Recommendations" },
  { href: "/admin", label: "Admin" },
];

const vehicleLinks = [
  { href: "/vehicles?vehicle_type=Hatchback", label: "Hatchbacks" },
  { href: "/vehicles?vehicle_type=Sedan", label: "Sedans" },
  { href: "/vehicles?vehicle_type=SUV", label: "SUVs" },
  { href: "/vehicles?vehicle_type=MUV", label: "MUVs" },
  { href: "/vehicles?fuel_type=Electric", label: "Electric" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Car className="size-4" aria-hidden="true" />
            </span>
            VehicleAI
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Search, compare, and discover vehicles that match your budget,
            lifestyle, and priorities — with AI-assisted recommendations.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Navigation
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Browse by type
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {vehicleLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {year} VehicleAI. All rights reserved.</p>
          <p>Vehicle Analysis and AI-Based Recommendation System</p>
        </div>
      </div>
    </footer>
  );
}
