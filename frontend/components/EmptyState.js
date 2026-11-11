import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title = "Nothing here yet",
  description = "Content will appear once data is available.",
  icon: Icon = Inbox,
  action = null,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-input bg-card/60 px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-sage text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
