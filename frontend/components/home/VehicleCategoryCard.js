import Link from "next/link";
import { Car, Fuel, CarFront, Truck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  Hatchback: Car,
  Sedan: CarFront,
  SUV: Truck,
  MUV: Car,
  Electric: Zap,
};

export function VehicleCategoryCard({
  label,
  description,
  href,
  icon,
  className,
}) {
  const Icon = icon || ICONS[label] || Fuel;

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-border/80 bg-white p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
        className
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="font-semibold text-foreground">{label}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </Link>
  );
}
