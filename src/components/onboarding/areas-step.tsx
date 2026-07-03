"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAreas } from "@/lib/hooks/use-areas";

/**
 * Areas step: the default areas are already seeded on first auth (AuthProvider
 * bootstrap), so this confirms/reviews them rather than creating from blank.
 * Purely informational — advancing needs no input.
 */
export function AreasStep() {
  const { data: areas, isLoading } = useAreas();

  if (isLoading) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Loading your areas…
      </p>
    );
  }

  if (!areas?.length) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Your starter areas are being set up. You can continue and add more later.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {areas.map((area) => (
        <Card
          key={area.id}
          className={cn(
            "flex flex-col items-center gap-1 p-4 text-center",
            "border-border/60",
          )}
        >
          <span className="text-2xl">{area.icon}</span>
          <span className="text-sm font-medium">{area.name}</span>
        </Card>
      ))}
    </div>
  );
}
