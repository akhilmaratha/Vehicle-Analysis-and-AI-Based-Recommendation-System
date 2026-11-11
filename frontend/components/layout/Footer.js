import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";

const exploreLinks = [
  { href: "/vehicles", label: "Explore Vehicles" },
  { href: "/compare", label: "Compare" },
  { href: "/recommendations", label: "AI Recommendations" },
];

const categoryLinks = [
  { href: "/vehicles?vehicle_type=Hatchback", label: "Hatchbacks" },
  { href: "/vehicles?vehicle_type=Sedan", label: "Sedans" },
  { href: "/vehicles?vehicle_type=SUV", label: "SUVs" },
  { href: "/vehicles?vehicle_type=MUV", label: "MUVs" },
  { href: "/vehicles?fuel_type=Electric", label: "Electric" },
];

const manageLinks = [
  { href: "/admin", label: "Admin dashboard" },
  { href: "/admin/vehicles", label: "Manage vehicles" },
];

function FooterColumn({ title, links }) {
  return (
    <div>
      <h2 className="font-heading text-sm font-bold text-card">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-card/70 transition-colors hover:text-card"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-primary text-card">
      <div className="page-container grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-8">
        <div className="max-w-sm space-y-4">
          <BrandMark tone="inverse" />
          <p className="text-sm leading-relaxed text-card/70">
            A calmer way to choose a car. Browse a real catalog, compare the
            details side by side, and get recommendations ranked against your
            budget and everyday needs.
          </p>
        </div>
        <FooterColumn title="Explore" links={exploreLinks} />
        <FooterColumn title="Categories" links={categoryLinks} />
        <FooterColumn title="Manage" links={manageLinks} />
      </div>
      <div className="border-t border-card/15">
        <div className="page-container flex flex-col gap-1 py-5 text-xs text-card/60 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} VehicleAI. All rights reserved.</p>
          <p>Vehicle Analysis and AI-Based Recommendation System</p>
        </div>
      </div>
    </footer>
  );
}
