"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function NaturalLanguagePreferenceInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'e.g. "I need an SUV under ₹15 lakh, preferably diesel, automatic, with good mileage and safety."',
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.(value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Describe what you need</CardTitle>
        <CardDescription>
          Tell us in plain language. We extract structured preferences for you
          to confirm before ranking.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3">
          <Label htmlFor="nl-preferences">Your request</Label>
          <Textarea
            id="nl-preferences"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={4}
          />
        </CardContent>
        <CardFooter>
          <Button type="submit" size="lg" disabled={disabled || !value?.trim()}>
            Extract preferences
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
