import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const;

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div role="status" className={cn("inline-flex", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeMap[size])} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
