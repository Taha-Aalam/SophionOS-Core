"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface ExpiryOption {
  label: string;
  value: string | null;
}

const DEFAULT_OPTIONS: ExpiryOption[] = [
  { label: "No expiry", value: null },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "6 months", value: "180" },
  { label: "1 year", value: "365" },
];

/**
 * Returns an ISO date string N days from now, or null for "no expiry".
 */
export function expiryDaysToISO(days: string | null): string | null {
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() + parseInt(days, 10));
  return d.toISOString();
}

export function ApiKeyExpirySelect({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options?: ExpiryOption[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>Key expiry</Label>
      <Select
        value={value ?? "__none__"}
        onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="No expiry" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value ?? "__none__"} value={opt.value ?? "__none__"}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
