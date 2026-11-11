import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong",
  description = "We could not complete this request. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.04] px-6 py-12 text-center",
        className
      )}
      role="alert"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed break-words text-muted-foreground">
          {description}
        </p>
      </div>
      {typeof onRetry === "function" ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
