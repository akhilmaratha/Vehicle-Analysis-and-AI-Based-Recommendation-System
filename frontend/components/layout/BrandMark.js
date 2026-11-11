import Link from "next/link";
import { cn } from "@/lib/utils";

/** VehicleAI wordmark. `tone="inverse"` for use on forest-green surfaces. */
export function BrandMark({ href = "/", compact = false, tone = "default", className, onClick }) {
  const inverse = tone === "inverse";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        className
      )}
      aria-label="VehicleAI home"
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-md font-heading text-[0.95rem] font-extrabold",
          inverse ? "bg-card text-primary" : "bg-primary text-primary-foreground"
        )}
        aria-hidden="true"
      >
        V
      </span>
      {compact ? null : (
        <span
          className={cn(
            "font-heading text-lg font-extrabold tracking-tight",
            inverse ? "text-card" : "text-foreground"
          )}
        >
          Vehicle<span className={inverse ? "text-sage" : "text-primary"}>AI</span>
        </span>
      )}
    </Link>
  );
}
