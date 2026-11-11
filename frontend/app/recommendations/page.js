"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { NaturalLanguagePreferenceInput } from "@/components/recommendations/NaturalLanguagePreferenceInput";
import { ExtractedPreferencesEditor } from "@/components/recommendations/ExtractedPreferencesEditor";
import { FollowUpInput } from "@/components/recommendations/FollowUpInput";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import { VehicleSearchForm } from "@/components/vehicles/VehicleSearchForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  extractPreferences,
  getAiRecommendations,
  getRecommendations,
  explainRecommendations,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

function prefsFromSearchParams(searchParams) {
  if (!searchParams) return null;
  const initial = {};
  const budget = searchParams.get("budget");
  const fuel = searchParams.get("fuel_type");
  const transmission = searchParams.get("transmission");
  const vehicleType = searchParams.get("vehicle_type");
  const mileage = searchParams.get("minimum_mileage");
  const seats = searchParams.get("seating_capacity");
  if (budget) initial.budget = budget;
  if (fuel) initial.fuel_type = fuel;
  if (transmission) initial.transmission = transmission;
  if (vehicleType) initial.vehicle_type = vehicleType;
  if (mileage) initial.minimum_mileage = mileage;
  if (seats) initial.seating_capacity = seats;
  return Object.keys(initial).length ? initial : null;
}

function summarizePreferences(preferences) {
  if (!preferences) return [];
  const rows = [];
  if (preferences.budget_min != null || preferences.budget_max != null) {
    const min =
      preferences.budget_min != null ? formatPrice(preferences.budget_min) : null;
    const max =
      preferences.budget_max != null ? formatPrice(preferences.budget_max) : null;
    rows.push({
      label: "Budget",
      value: min && max ? `${min} – ${max}` : max ? `Up to ${max}` : `From ${min}`,
    });
  }
  if (preferences.vehicle_type) rows.push({ label: "Type", value: preferences.vehicle_type });
  if (preferences.fuel_type) rows.push({ label: "Fuel", value: preferences.fuel_type });
  if (preferences.transmission)
    rows.push({ label: "Transmission", value: preferences.transmission });
  if (preferences.seating_capacity != null)
    rows.push({ label: "Seats", value: `${preferences.seating_capacity}+` });
  if (preferences.preferred_mileage != null)
    rows.push({ label: "Mileage", value: `${preferences.preferred_mileage} km/l` });
  if (preferences.preferred_safety_rating != null)
    rows.push({ label: "Safety", value: `${preferences.preferred_safety_rating} / 5` });
  if (preferences.priorities?.length)
    rows.push({
      label: "Priorities",
      value: preferences.priorities
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(", "),
    });
  return rows;
}

const LOADING_COPY = {
  extract: "Reading your request and pulling out your preferences…",
  rank: "Ranking catalog vehicles against your preferences…",
  refine: "Updating your recommendations…",
};

function StepIndicator({ steps, current }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" aria-label="Progress">
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "current" : "upcoming";
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full font-heading text-xs font-bold tabular",
                state === "current" && "bg-primary text-primary-foreground",
                state === "done" && "bg-sage text-primary",
                state === "upcoming" && "border border-input text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "font-medium",
                state === "upcoming" ? "text-muted-foreground" : "text-foreground"
              )}
              aria-current={state === "current" ? "step" : undefined}
            >
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-border sm:w-10" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function LoadingPanel({ kind }) {
  return (
    <div className="space-y-5" aria-busy="true">
      <div
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-foreground/80">{LOADING_COPY[kind] || LOADING_COPY.rank}</p>
      </div>
      {kind === "extract" ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-7">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from({ length: 2 }, (_, i) => (
            <div
              key={i}
              className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[0.8fr_1.2fr]"
            >
              <Skeleton className="aspect-[16/10] rounded-none md:aspect-auto md:min-h-64" />
              <div className="space-y-4 p-5 sm:p-7">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationsPageInner() {
  const searchParams = useSearchParams();
  const formInitial = useMemo(
    () => prefsFromSearchParams(searchParams),
    [searchParams]
  );

  const [mode, setMode] = useState(() => (formInitial ? "structured" : "nl")); // nl | structured
  const [nlText, setNlText] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [phase, setPhase] = useState("input"); // input | confirm | results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [draftPreferences, setDraftPreferences] = useState(null);
  const [currentPreferences, setCurrentPreferences] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [comparisonSummary, setComparisonSummary] = useState("");
  const [alternativesSummary, setAlternativesSummary] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loadingKind, setLoadingKind] = useState("rank");
  const abortRef = useRef(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const beginRequest = useCallback((kind = "rank") => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingKind(kind);
    setLoading(true);
    setError(null);
    return controller;
  }, []);

  const handleExtract = useCallback(
    async (message) => {
      const controller = beginRequest("extract");
      try {
        const result = await extractPreferences(
          { message },
          { signal: controller.signal }
        );
        setClarificationQuestions(result.clarification_questions || []);
        setDraftPreferences(result.preferences || null);
        if (result.status === "error") {
          setError(result.message || "Preference extraction failed");
          setPhase("input");
          return;
        }
        setPhase("confirm");
        if (result.status === "needs_clarification") {
          setStatusMessage(
            result.message || "Please clarify or edit the preferences below."
          );
        } else {
          setStatusMessage(result.message || "Preferences ready for confirmation.");
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err.message || "Failed to extract preferences");
      } finally {
        setLoading(false);
      }
    },
    [beginRequest]
  );

  const applyAiResult = useCallback((result) => {
    setClarificationQuestions(result.clarification_questions || []);
    if (result.status === "needs_clarification") {
      setDraftPreferences(result.preferences || draftPreferences);
      setPhase("confirm");
      setStatusMessage(result.message || "More details needed.");
      setRecommendations([]);
      setAlternatives([]);
      return;
    }
    if (result.status === "error") {
      setError(result.message || "AI recommendation failed");
      return;
    }
    setCurrentPreferences(result.preferences || null);
    setDraftPreferences(result.preferences || null);
    setRecommendations(result.recommendations || []);
    setAlternatives(result.alternatives || []);
    setComparisonSummary(result.comparison_summary || "");
    setAlternativesSummary(result.alternatives_summary || "");
    setStatusMessage(result.message || "");
    setPhase("results");
  }, [draftPreferences]);

  const handleConfirmPreferences = useCallback(
    async (preferences) => {
      const controller = beginRequest();
      try {
        const result = await getAiRecommendations(
          {
            preferences,
            generate_explanations: true,
          },
          { signal: controller.signal }
        );
        applyAiResult(result);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err.message || "Failed to get recommendations");
      } finally {
        setLoading(false);
      }
    },
    [applyAiResult, beginRequest]
  );

  const handleFollowUp = useCallback(
    async (message) => {
      if (!currentPreferences) {
        setError("Confirm preferences first, then refine with a follow-up.");
        return;
      }
      const controller = beginRequest("refine");
      try {
        const result = await getAiRecommendations(
          {
            message,
            previous_preferences: currentPreferences,
            generate_explanations: true,
          },
          { signal: controller.signal }
        );
        setFollowUp("");
        applyAiResult(result);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err.message || "Follow-up failed");
      } finally {
        setLoading(false);
      }
    },
    [applyAiResult, beginRequest, currentPreferences]
  );

  const handleStructuredSubmit = useCallback(
    async (payload) => {
      const controller = beginRequest();
      try {
        const ranked = await getRecommendations(payload, {
          signal: controller.signal,
        });
        let explanations = null;
        try {
          explanations = await explainRecommendations(
            {
              preferences: {
                budget_max: payload.budget ?? payload.budget_max,
                budget_min: payload.budget_min,
                fuel_type: payload.fuel_type,
                transmission: payload.transmission,
                vehicle_type: payload.vehicle_type,
                seating_capacity: payload.seating_capacity,
                preferred_mileage:
                  payload.preferred_mileage ?? payload.minimum_mileage,
                priorities: payload.priorities || [],
              },
              recommendations: ranked.recommendations || [],
              alternatives: ranked.alternatives || [],
            },
            { signal: controller.signal }
          );
        } catch {
          explanations = null;
        }

        const byId = {};
        for (const item of explanations?.explanations || []) {
          byId[item.vehicle_id] = item;
        }

        const withExplain = (list) =>
          (list || []).map((item) => ({
            ...item,
            ai_explanation: byId[item.id] || null,
          }));

        const preferences = {
          budget_max: payload.budget ?? payload.budget_max,
          budget_min: payload.budget_min,
          fuel_type: payload.fuel_type,
          transmission: payload.transmission,
          vehicle_type: payload.vehicle_type,
          seating_capacity: payload.seating_capacity,
          preferred_mileage:
            payload.preferred_mileage ?? payload.minimum_mileage,
          priorities: payload.priorities || [],
        };

        setCurrentPreferences(preferences);
        setDraftPreferences(preferences);
        setRecommendations(withExplain(ranked.recommendations));
        setAlternatives(withExplain(ranked.alternatives));
        setComparisonSummary(explanations?.comparison_summary || "");
        setAlternativesSummary(explanations?.alternatives_summary || "");
        setStatusMessage(ranked.message || "");
        setClarificationQuestions([]);
        setPhase("results");
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err.message || "Structured recommendation failed");
      } finally {
        setLoading(false);
      }
    },
    [beginRequest]
  );

  function handleStartOver() {
    setPhase("input");
    setRecommendations([]);
    setAlternatives([]);
    setComparisonSummary("");
    setAlternativesSummary("");
    setFollowUp("");
  }

  const preferenceRows = summarizePreferences(currentPreferences || draftPreferences);

  const steps = mode === "nl" ? ["Describe", "Confirm", "Results"] : ["Preferences", "Results"];
  const currentStep =
    phase === "results"
      ? steps.length - 1
      : mode === "nl" && phase === "confirm"
        ? 1
        : 0;

  const showInputs = !loading && phase !== "results";

  return (
    <div className="page-container space-y-10 pt-10 pb-16 sm:pt-14 sm:pb-20">
      <PageHeader
        eyebrow="AI recommendations"
        title="Let’s find the right car for you"
        description="Tell us what you need in your own words or with a quick form. We confirm the details with you, then rank real catalog vehicles and explain each pick."
      />

      <div className="flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
        <StepIndicator steps={steps} current={currentStep} />
        {phase !== "results" ? (
          <Tabs
            value={mode}
            onValueChange={(next) => {
              if (!loading) setMode(next);
            }}
          >
            <TabsList className="h-10! bg-secondary p-1">
              <TabsTrigger value="nl" disabled={loading} className="px-3">
                Describe it
              </TabsTrigger>
              <TabsTrigger value="structured" disabled={loading} className="px-3">
                Use a form
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <Button type="button" variant="ghost" onClick={handleStartOver} disabled={loading}>
            <RotateCcw data-icon="inline-start" aria-hidden="true" />
            Start over
          </Button>
        )}
      </div>

      {error ? (
        <ErrorState
          title="We could not complete that request"
          description={error}
          onRetry={() => setError(null)}
          retryLabel="Dismiss"
        />
      ) : null}

      {loading && phase !== "results" ? <LoadingPanel kind={loadingKind} /> : null}

      {mode === "nl" && phase === "input" && showInputs ? (
        <NaturalLanguagePreferenceInput
          value={nlText}
          onChange={setNlText}
          onSubmit={handleExtract}
          disabled={loading}
        />
      ) : null}

      {mode === "nl" && phase === "confirm" && showInputs ? (
        <ExtractedPreferencesEditor
          preferences={draftPreferences}
          clarificationQuestions={clarificationQuestions}
          statusMessage={statusMessage}
          onConfirm={handleConfirmPreferences}
          onCancel={() => {
            setPhase("input");
            setClarificationQuestions([]);
          }}
          disabled={loading}
        />
      ) : null}

      {mode === "structured" && showInputs ? (
        <VehicleSearchForm
          onSubmit={handleStructuredSubmit}
          disabled={loading}
          initialValues={formInitial}
        />
      ) : null}

      {phase === "results" ? (
        <div className="space-y-12">
          <section
            aria-label="Your requirements"
            className="grid gap-6 rounded-xl border border-border bg-card p-5 sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-bold">Your requirements</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPhase(mode === "nl" ? "confirm" : "input");
                  }}
                  disabled={loading}
                >
                  Edit
                </Button>
              </div>
              {preferenceRows.length ? (
                <ul className="flex flex-wrap gap-2">
                  {preferenceRows.map((row) => (
                    <li
                      key={row.label}
                      className="rounded-md bg-sage px-2.5 py-1.5 text-sm text-primary"
                    >
                      <span className="text-primary/70">{row.label}:</span>{" "}
                      <span className="font-medium">{row.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No preferences set.</p>
              )}
            </div>
            <div className="lg:border-l lg:border-border lg:pl-10">
              <FollowUpInput
                value={followUp}
                onChange={setFollowUp}
                onSubmit={handleFollowUp}
                disabled={loading || !currentPreferences}
              />
            </div>
          </section>

          {loading ? (
            <LoadingPanel kind={loadingKind} />
          ) : (
            <>
              <section aria-labelledby="top-picks-heading" className="space-y-6">
                <div className="space-y-2">
                  <p className="eyebrow">Top recommendations</p>
                  <h2 id="top-picks-heading" className="font-heading text-2xl font-bold sm:text-3xl">
                    {recommendations.length
                      ? `Your ${recommendations.length === 1 ? "best match" : `top ${recommendations.length} matches`}`
                      : "No matches yet"}
                  </h2>
                  {statusMessage && recommendations.length ? (
                    <p className="max-w-3xl text-sm text-muted-foreground">{statusMessage}</p>
                  ) : null}
                </div>

                {comparisonSummary && recommendations.length > 1 ? (
                  <div className="max-w-4xl border-l-2 border-primary pl-5">
                    <p className="font-heading text-sm font-bold">How these compare</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                      {comparisonSummary}
                    </p>
                  </div>
                ) : null}

                {recommendations.length === 0 ? (
                  <EmptyState
                    title="No vehicles matched your requirements"
                    description={
                      statusMessage ||
                      "No vehicles matched the mandatory filters. Try relaxing your budget, fuel or body type."
                    }
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPhase(mode === "nl" ? "confirm" : "input")}
                      >
                        Adjust preferences
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-5">
                    {recommendations.map((item) => (
                      <RecommendationCard key={item.id} recommendation={item} />
                    ))}
                  </div>
                )}
              </section>

              {alternatives.length > 0 ? (
                <section
                  aria-labelledby="alternatives-heading"
                  className="space-y-6 rounded-2xl bg-surface/70 p-5 sm:p-8"
                >
                  <div className="max-w-3xl space-y-2">
                    <p className="eyebrow">Also worth a look</p>
                    <h2 id="alternatives-heading" className="font-heading text-2xl font-bold">
                      Alternatives
                    </h2>
                    {alternativesSummary ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {alternativesSummary}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {alternatives.map((item) => (
                      <RecommendationCard key={item.id} recommendation={item} variant="compact" />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading recommendations…" />}>
      <RecommendationsPageInner />
    </Suspense>
  );
}
