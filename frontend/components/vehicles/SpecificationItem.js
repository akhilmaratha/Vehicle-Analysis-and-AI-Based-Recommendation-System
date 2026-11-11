import { cn } from "@/lib/utils";

/**
 * Label/value spec. Missing values render muted as "Not available".
 */
export function SpecificationItem({ label, value, icon: Icon, className, variant = "default" }) {
  const missing = value == null || value === "";

  if (variant === "inline") {
    return (
      <div className={cn("flex min-w-0 items-center gap-1.5 text-sm", className)}>
        {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
        <span className="sr-only">{label}: </span>
        <span className={cn("truncate", missing ? "text-muted-foreground" : "text-foreground/85")}>
          {missing ? "—" : value}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd
        className={cn(
          "font-heading text-[0.9375rem] font-semibold break-words",
          missing ? "font-normal text-muted-foreground" : "text-foreground"
        )}
      >
        {missing ? "Not available" : value}
      </dd>
    </div>
  );
}
