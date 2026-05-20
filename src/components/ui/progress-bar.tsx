import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percentage: number;
  className?: string;
}

export function ProgressBar({ percentage, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {clamped}%
      </span>
    </div>
  );
}
