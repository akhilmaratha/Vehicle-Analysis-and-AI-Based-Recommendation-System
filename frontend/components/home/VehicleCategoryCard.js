import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Text-led category tile linking to an existing /vehicles filter URL. */
export function VehicleCategoryCard({ label, description, href, index, className }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-40 flex-col justify-between gap-6 rounded-xl border border-border bg-card p-5 transition-[border-color,background-color] duration-200 hover:border-primary/40 hover:bg-sage/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {index != null ? (
          <span className="font-heading text-xs font-bold text-muted-foreground tabular">
            {String(index).padStart(2, "0")}
          </span>
        ) : (
          <span />
        )}
        <ArrowUpRight
          className="size-4 text-muted-foreground transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      <div>
        <h3 className="font-heading text-xl font-bold">{label}</h3>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
