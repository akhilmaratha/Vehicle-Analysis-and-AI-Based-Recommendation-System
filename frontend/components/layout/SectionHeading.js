import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  as: Heading = "h2",
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center"
          ? "items-center text-center"
          : "sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn("space-y-2.5", align === "center" ? "max-w-2xl" : "max-w-2xl")}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <Heading className="font-heading text-2xl font-bold text-balance sm:text-3xl">
          {title}
        </Heading>
        {description ? (
          <p className="text-base leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
