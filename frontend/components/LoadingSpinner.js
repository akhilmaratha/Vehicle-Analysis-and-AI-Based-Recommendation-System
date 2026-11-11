import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({
  className,
  label = "Loading...",
  size = "md",
}) {
  const iconSize = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2.5 py-10 text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className={cn(iconSize, "animate-spin text-primary")} aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
