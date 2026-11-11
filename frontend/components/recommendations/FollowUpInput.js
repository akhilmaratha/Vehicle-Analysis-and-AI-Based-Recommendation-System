"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FollowUpInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'e.g. "Show me something cheaper" or "I prefer automatic"',
}) {
  function handleSubmit(event) {
    event.preventDefault();
    if (!value?.trim()) return;
    onSubmit?.(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border p-4">
      <Label htmlFor="follow-up">Refine your preferences</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="follow-up"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button type="submit" disabled={disabled || !value?.trim()}>
          Update recommendations
        </Button>
      </div>
    </form>
  );
}
