"use client";

import { FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SectionHeader({
  accentClass,
  title,
  description,
  totalCount,
  buttonLabel,
  onNew,
  isPending,
}: {
  accentClass: string;
  title: string;
  description: string;
  totalCount?: number;
  buttonLabel: string;
  onNew: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className={cn("mt-1.5 h-full min-h-[2.5rem] w-px shrink-0 rounded-full", accentClass)} />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold font-heading">{title}</h2>
            {typeof totalCount === "number" ? (
              <span className="text-sm text-muted-foreground">{totalCount} total</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button size="sm" onClick={onNew} disabled={isPending} className="shrink-0 gap-1.5">
        <FilePlus className="size-3.5" />
        {buttonLabel}
      </Button>
    </div>
  );
}
