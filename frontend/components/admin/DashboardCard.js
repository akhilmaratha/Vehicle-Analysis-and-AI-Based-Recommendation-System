export function DashboardCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon ? (
          <span className="flex size-8 items-center justify-center rounded-md bg-sage text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-heading text-3xl font-extrabold tracking-tight tabular">{value}</p>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
