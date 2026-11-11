"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NaturalLanguagePreferenceInput } from "@/components/recommendations/NaturalLanguagePreferenceInput";
import { ExtractedPreferencesEditor } from "@/components/recommendations/ExtractedPreferencesEditor";
import { FollowUpInput } from "@/components/recommendations/FollowUpInput";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import { VehicleSearchForm } from "@/components/vehicles/VehicleSearchForm";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  extractPreferences,
  getAiRecommendations,
  getRecommendations,
  explainRecommendations,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";

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
      preferences.budget_min != null ? formatPrice(preferences.budget_min) : "—";
    const max =
      preferences.budget_max != null ? formatPrice(preferences.budget_max) : "—";
    rows.push(`Budget: ${min} – ${max}`);
  }
  if (preferences.vehicle_type) rows.push(`Type: ${preferences.vehicle_type}`);
  if (preferences.fuel_type) rows.push(`Fuel: ${preferences.fuel_type}`);
  if (preferences.transmission)
    rows.push(`Transmission: ${preferences.transmission}`);
  if (preferences.seating_capacity != null)
    rows.push(`Seats ≥ ${preferences.seating_capacity}`);
  if (preferences.preferred_mileage != null)
    rows.push(`Preferred mileage: ${preferences.preferred_mileage}`);
  if (preferences.preferred_safety_rating != null)
    rows.push(`Preferred safety: ${preferences.preferred_safety_rating}`);
  if (preferences.priorities?.length)
    rows.push(`Priorities: ${preferences.priorities.join(", ")}`);
  return rows;
}

function RecommendationsPageInner() {
  const searchParams = useSearchParams();
  const formInitial = useMemo(
    () => prefsFromSearchParams(searchParams),
    [searchParams]
  );

  const [mode, setMode] = useState("nl"); // nl | structured
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
  const abortRef = useRef(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const beginRequest = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    return controller;
  }, []);

  const handleExtract = useCallback(
    async (message) => {
      const controller = beginRequest();
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
      const controller = beginRequest();
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

  const preferenceRows = summarizePreferences(currentPreferences || draftPreferences);

  return (
    <div className="page-container space-y-6 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Recommendations
          </h1>
          <p className="mt-1 text-muted-foreground">
            Natural-language preferences with AI explanations. Ranking stays on
            the existing Python pipeline.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "nl" ? "default" : "outline"}
            onClick={() => setMode("nl")}
            disabled={loading}
          >
            Natural language
          </Button>
          <Button
            type="button"
            variant={mode === "structured" ? "default" : "outline"}
            onClick={() => setMode("structured")}
            disabled={loading}
          >
            Structured form
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState
          title="Something went wrong"
          description={error}
          onRetry={() => setError(null)}
          retryLabel="Dismiss"
        />
      ) : null}

      {loading ? <LoadingSpinner label="Working with the recommendation API…" /> : null}

      {mode === "nl" && phase === "input" && !loading ? (
        <NaturalLanguagePreferenceInput
          value={nlText}
          onChange={setNlText}
          onSubmit={handleExtract}
          disabled={loading}
        />
      ) : null}

      {mode === "nl" && phase === "confirm" && !loading ? (
        <div className="space-y-3">
          {statusMessage ? (
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
          ) : null}
          <ExtractedPreferencesEditor
            preferences={draftPreferences}
            clarificationQuestions={clarificationQuestions}
            onConfirm={handleConfirmPreferences}
            onCancel={() => {
              setPhase("input");
              setClarificationQuestions([]);
            }}
            disabled={loading}
          />
        </div>
      ) : null}

      {mode === "structured" && phase !== "results" && !loading ? (
        <VehicleSearchForm
          onSubmit={handleStructuredSubmit}
          disabled={loading}
          initialValues={formInitial}
        />
      ) : null}

      {phase === "results" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Your requirements</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPhase(mode === "nl" ? "confirm" : "input");
                }}
                disabled={loading}
              >
                Edit preferences
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {preferenceRows.length ? (
                preferenceRows.map((row) => <p key={row}>{row}</p>)
              ) : (
                <p className="text-muted-foreground">No preferences set.</p>
              )}
            </CardContent>
          </Card>

          <FollowUpInput
            value={followUp}
            onChange={setFollowUp}
            onSubmit={handleFollowUp}
            disabled={loading || !currentPreferences}
          />

          {comparisonSummary ? (
            <Card>
              <CardHeader>
                <CardTitle>How these differ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{comparisonSummary}</p>
              </CardContent>
            </Card>
          ) : null}

          <div>
            <h2 className="mb-4 text-xl font-semibold">Recommended vehicles</h2>
            {recommendations.length === 0 ? (
              <EmptyState
                title="No matches"
                description={
                  statusMessage ||
                  "No vehicles matched the mandatory filters. Try relaxing budget or type."
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((item) => (
                  <RecommendationCard key={item.id} recommendation={item} />
                ))}
              </div>
            )}
          </div>

          {alternatives.length > 0 ? (
            <div>
              <h2 className="mb-2 text-xl font-semibold">Alternatives</h2>
              {alternativesSummary ? (
                <p className="mb-4 text-sm text-muted-foreground">
                  {alternativesSummary}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {alternatives.map((item) => (
                  <RecommendationCard key={item.id} recommendation={item} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPhase("input");
                setRecommendations([]);
                setAlternatives([]);
                setComparisonSummary("");
                setAlternativesSummary("");
                setFollowUp("");
              }}
            >
              Start over
            </Button>
          </div>
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
