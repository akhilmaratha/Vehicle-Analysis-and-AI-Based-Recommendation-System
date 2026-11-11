"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const EXAMPLES = [
  "I need an SUV under ₹15 lakh, automatic, with good mileage and safety.",
  "A comfortable 7-seater for family trips, under ₹20 lakh.",
  "An efficient city hatchback under ₹8 lakh, petrol or CNG.",
];

export function NaturalLanguagePreferenceInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "I need an SUV under ₹15 lakh, automatic, with good mileage and safety.",
}) {
  const [validation, setValidation] = useState("");

  function submit() {
    const text = value?.trim();
    if (!text) {
      setValidation("Tell us a little about what you are looking for first.");
      return;
    }
    if (text.length < 8) {
      setValidation("Add a few more details — budget, body type or fuel all help.");
      return;
    }
    setValidation("");
    onSubmit?.(value);
  }

  function handleSubmit(event) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card">
      <div className="space-y-4 p-5 sm:p-7">
        <div className="space-y-1.5">
          <Label htmlFor="nl-preferences" className="font-heading text-lg font-bold">
            Describe the car you need
          </Label>
          <p id="nl-preferences-hint" className="text-sm text-muted-foreground">
            Mention your budget, body type, fuel, transmission or anything that
            matters. We will confirm the details with you before ranking.
          </p>
        </div>
        <Textarea
          id="nl-preferences"
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value);
            if (validation) setValidation("");
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={5}
          className="min-h-36 resize-y bg-background/60 text-base leading-relaxed md:text-base"
          aria-invalid={validation ? true : undefined}
          aria-describedby={validation ? "nl-preferences-error" : "nl-preferences-hint"}
        />
        {validation ? (
          <p id="nl-preferences-error" className="text-sm text-destructive" role="alert">
            {validation}
          </p>
        ) : null}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange?.(example);
                  setValidation("");
                }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:bg-sage/50 hover:text-foreground disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border bg-secondary/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-xs text-muted-foreground">
          Press Ctrl + Enter to continue.
        </p>
        <Button type="submit" size="lg" disabled={disabled}>
          Extract preferences
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
