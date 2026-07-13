import type { LinearFilter, LinearFilterOperator } from "@/components/ui/linear-filters";

export function filterValues(filters: LinearFilter[], type: string): string[] {
  return filters.find((f) => f.type === type)?.value ?? [];
}

export function filterSingle(filters: LinearFilter[], type: string): string {
  return filterValues(filters, type)[0] ?? "";
}

export function makeFilter(
  type: string,
  value: string[],
  selection: "single" | "multi" = "multi",
): LinearFilter | null {
  if (value.length === 0) return null;
  const operator: LinearFilterOperator =
    selection === "single" || value.length === 1 ? "is" : "is any of";
  return { id: type, type, operator, value };
}

export function buildFilters(
  parts: Array<{ type: string; value: string[]; selection?: "single" | "multi" }>,
): LinearFilter[] {
  return parts
    .map((p) => makeFilter(p.type, p.value, p.selection ?? "multi"))
    .filter((f): f is LinearFilter => f !== null);
}
