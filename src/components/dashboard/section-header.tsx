import { cn } from "@/lib/utils";

export function SectionHeader({
  accentClass,
  title,
  description,
  totalCount,
}: {
  accentClass: string;
  title: string;
  description: string;
  totalCount?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-1 h-8 w-1 shrink-0 rounded-full",
            accentClass,
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {typeof totalCount === "number" ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-2xs font-medium tabular-nums text-muted-foreground">
                {totalCount}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
