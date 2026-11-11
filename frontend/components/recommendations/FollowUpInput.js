"use client";

import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FollowUpInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "e.g. Show me something cheaper, or I prefer automatic",
}) {
  function handleSubmit(event) {
    event.preventDefault();
    if (!value?.trim()) return;
    onSubmit?.(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <Label htmlFor="follow-up" className="font-heading text-sm font-bold">
        Refine in your own words
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="follow-up"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="sm:h-11"
        />
        <Button type="submit" className="sm:h-11" disabled={disabled || !value?.trim()}>
          Update
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
