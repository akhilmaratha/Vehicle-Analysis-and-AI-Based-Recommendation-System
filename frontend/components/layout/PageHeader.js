import { cn } from "@/lib/utils";

/**
 * Editorial page header used at the top of public and admin pages.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  size = "default",
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="max-w-3xl space-y-3">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1
          className={cn(
            "font-heading font-bold text-balance text-foreground",
            size === "compact"
              ? "text-2xl sm:text-3xl"
              : "text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
