"use client";

import Link from "next/link";















import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

export function RecommendationCard({ recommendation }) {
  const explanation = recommendation.ai_explanation;
  const mileageLabel =
    recommendation.mileage != null ? `${recommendation.mileage} km/l` : "Mileage N/A";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>
              {recommendation.brand} {recommendation.model}
            </CardTitle>
            <CardDescription>{formatPrice(recommendation.price)}</CardDescription>
          </div>
          <Badge>{recommendation.match_percentage}% match</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{recommendation.fuel_type}</Badge>
          <Badge variant="secondary">{recommendation.transmission}</Badge>
          <Badge variant="outline">{mileageLabel}</Badge>
          {recommendation.rank != null ? (
            <Badge variant="outline">Rank #{recommendation.rank}</Badge>
          ) : null}
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Why this vehicle?</p>
          <p className="text-sm text-muted-foreground">
            {explanation?.why_matches ||
              recommendation.reason ||
              "Matched your confirmed preferences via the ranking pipeline."}
          </p>
        </div>
        {explanation?.advantages?.length ? (
          <div>
            <p className="mb-1 text-sm font-medium">Advantages</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {explanation.advantages.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {explanation?.compromises?.length ? (
          <div>
            <p className="mb-1 text-sm font-medium">Potential compromises</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {explanation.compromises.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        {recommendation.id != null ? (
          <Button variant="outline" className="w-full" nativeButton={false} render={<Link href={`/vehicles/${recommendation.id}`} />}>
            View Details
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            View Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
