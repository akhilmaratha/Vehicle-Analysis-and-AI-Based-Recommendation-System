import Link from "next/link";
import { ArrowUpRight, Minus, Plus } from "lucide-react";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { PriceDisplay } from "@/components/vehicles/PriceDisplay";
import { Badge } from "@/components/ui/badge";
import { formatMileage, formatScore, vehicleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { vehicleHref } from "@/lib/vehicle-slug";

const SCORES = [
  {
    key: "final_rank_score",
    label: "Final ranking",
    hint: "Blend of weighted score (70%) and similarity (30%)",
  },
  {
    key: "weighted_score",
    label: "Weighted",
    hint: "How well it meets your priorities",
  },
  {
    key: "similarity_score",
    label: "Similarity",
    hint: "How close it is to your stated preferences",
  },
];

function ScoreMeter({ label, hint, value, emphasis = false }) {
  const available = value != null && !Number.isNaN(Number(value));
  const pct = available ? Math.max(0, Math.min(100, Number(value) * 100)) : 0;

  return (
    <div className="min-w-0 space-y-1.5" title={hint}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-heading font-bold tabular",
            emphasis ? "text-base text-primary" : "text-sm text-foreground"
          )}
        >
          {formatScore(value)}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
        role="meter"
        aria-label={`${label} score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={available ? Math.round(pct) : undefined}
        aria-valuetext={available ? `${Math.round(pct)} percent` : "Not available"}
      >
        <div
          className={cn("h-full rounded-full", emphasis ? "bg-primary" : "bg-primary/45")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PointList({ title, items, tone }) {
  if (!items?.length) return null;
  const Icon = tone === "positive" ? Plus : Minus;
  return (
    <div className="space-y-2">
      <p className="font-heading text-sm font-bold">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-foreground/80">
            <Icon
              className={cn(
                "mt-1 size-3.5 shrink-0",
                tone === "positive" ? "text-primary" : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpecLine({ recommendation }) {
  const parts = [
    recommendation.fuel_type,
    recommendation.transmission,
    formatMileage(recommendation),
    recommendation.seating_capacity != null ? `${recommendation.seating_capacity} seats` : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className="text-sm text-muted-foreground">{parts.join(" · ")}</p>;
}

/**
 * Ranked recommendation. `variant="featured"` is the full horizontal layout for
 * primary results; `variant="compact"` is used for alternatives.
 */
export function RecommendationCard({ recommendation, variant = "featured" }) {
  const explanation = recommendation.ai_explanation;
  const title = vehicleTitle(recommendation);
  const why =
    explanation?.why_matches ||
    recommendation.reason ||
    "Matched your confirmed preferences via the ranking pipeline.";
  const href =
    recommendation?.id != null || recommendation?.slug
      ? vehicleHref(recommendation)
      : null;

  if (variant === "compact") {
    return (
      <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20">
        <VehicleImage
          src={recommendation.image_url}
          alt={title}
          aspect="card"
          showFallbackLabel={false}
          imageClassName="group-hover:scale-[1.03]"
        />
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {recommendation.rank != null ? `#${recommendation.rank} · ` : ""}
                {recommendation.brand}
              </p>
              <h3 className="font-heading text-base leading-snug font-bold">
                {href ? (
                  <Link
                    href={href}
                    className="outline-none after:absolute after:inset-0 focus-visible:underline"
                  >
                    {recommendation.model || title}
                  </Link>
                ) : (
                  recommendation.model || title
                )}
              </h3>
            </div>
            <PriceDisplay price={recommendation.price} size="sm" className="shrink-0 text-right" />
          </div>
          <SpecLine recommendation={recommendation} />
          <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">{why}</p>
          <div className="mt-auto border-t border-border pt-4">
            <ScoreMeter
              label="Final ranking"
              hint={SCORES[0].hint}
              value={recommendation.final_rank_score}
              emphasis
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="relative">
          <VehicleImage
            src={recommendation.image_url}
            alt={title}
            aspect="card"
            className="md:absolute md:inset-0 md:aspect-auto md:h-full"
            showFallbackLabel={false}
          />
          {recommendation.rank != null ? (
            <span className="absolute top-4 left-4 flex size-11 items-center justify-center rounded-lg bg-card font-heading text-lg font-extrabold text-primary tabular">
              <span className="sr-only">Rank </span>
              {recommendation.rank}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{recommendation.brand}</p>
              <h3 className="font-heading text-2xl leading-tight font-bold">
                {recommendation.model || title}
              </h3>
              {recommendation.variant ? (
                <p className="text-sm text-muted-foreground">{recommendation.variant}</p>
              ) : null}
            </div>
            <PriceDisplay price={recommendation.price} size="md" />
          </div>

          <div className="flex flex-wrap gap-2">
            {recommendation.vehicle_type ? (
              <Badge variant="sage">{recommendation.vehicle_type}</Badge>
            ) : null}
            {recommendation.fuel_type ? (
              <Badge variant="outline">{recommendation.fuel_type}</Badge>
            ) : null}
            {recommendation.transmission ? (
              <Badge variant="outline">{recommendation.transmission}</Badge>
            ) : null}
            {formatMileage(recommendation) ? (
              <Badge variant="outline">{formatMileage(recommendation)}</Badge>
            ) : null}
            {recommendation.seating_capacity != null ? (
              <Badge variant="outline">{recommendation.seating_capacity} seats</Badge>
            ) : null}
          </div>

          <div className="grid gap-4 rounded-lg bg-secondary/60 p-4 sm:grid-cols-3">
            {SCORES.map((score, index) => (
              <ScoreMeter
                key={score.key}
                label={score.label}
                hint={score.hint}
                value={recommendation[score.key]}
                emphasis={index === 0}
              />
            ))}
          </div>

          <div className="space-y-2">
            <p className="font-heading text-sm font-bold">Why it fits</p>
            <p className="text-sm leading-relaxed text-foreground/80">{why}</p>
          </div>

          {explanation?.advantages?.length || explanation?.compromises?.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <PointList title="Main advantages" items={explanation?.advantages} tone="positive" />
              <PointList title="Potential compromises" items={explanation?.compromises} tone="neutral" />
            </div>
          ) : null}

          {href ? (
            <Link
              href={href}
              className="group/link mt-auto inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              View full details
              <ArrowUpRight
                className="size-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
