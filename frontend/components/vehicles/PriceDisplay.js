import { formatINR, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl sm:text-4xl",
};

/**
 * Price in Manrope. `full` shows exact INR beneath the compact lakh figure.
 */
export function PriceDisplay({ price, size = "md", label, full = false, className }) {
  return (
    <div className={cn("space-y-0.5", className)}>
      {label ? (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      ) : null}
      <p
        className={cn(
          "font-heading font-bold tracking-tight text-foreground tabular",
          SIZES[size]
        )}
      >
        {formatPrice(price)}
      </p>
      {full && price != null ? (
        <p className="text-sm text-muted-foreground tabular">{formatINR(price)}</p>
      ) : null}
    </div>
  );
}
