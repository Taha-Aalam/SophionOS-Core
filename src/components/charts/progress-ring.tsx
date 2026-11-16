"use client";

import React, { startTransition, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supportsStartingStyle } from "@/lib/utils/native-features";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

/** Pure resolver for the two entry-animation paths (Step 0 parity contract).
 *  Native returns undefined so CSS @starting-style owns the initial offset;
 *  the fallback keeps the original rAF/mounted gate. */
export function resolveProgressRingOffset(
  nativeStartingStyle: boolean,
  mounted: boolean,
  targetOffset: number,
  circumference: number,
): number | undefined {
  if (nativeStartingStyle) return undefined;
  return mounted ? targetOffset : circumference;
}

export default function ProgressRing({
  percentage,
  size = 64,
  strokeWidth = 8,
  className,
  color = "text-primary",
}: ProgressRingProps) {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const targetOffset = circumference - (clampedPercentage / 100) * circumference;

  const [nativeStartingStyle, setNativeStartingStyle] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => setNativeStartingStyle(supportsStartingStyle()));
  }, []);

  useEffect(() => {
    if (nativeStartingStyle) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [nativeStartingStyle]);

  const offset = resolveProgressRingOffset(
    nativeStartingStyle,
    mounted,
    targetOffset,
    circumference,
  );
  // The fallback writes strokeDashoffset inline so it authority-overrides the
  // native CSS rule; otherwise CSS beats the SVG presentation attribute and the
  // rAF draw-in would never be visible.
  const ringStyle = {
    "--ring-start-offset": circumference,
    "--ring-target-offset": targetOffset,
    ...(nativeStartingStyle ? {} : { strokeDashoffset: offset }),
  } as React.CSSProperties;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted-foreground/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          style={ringStyle}
          strokeLinecap="round"
          className={cn("progress-ring__progress transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-quint)]", color)}
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums">
        {Math.round(clampedPercentage)}%
      </span>
    </div>
  );
}
