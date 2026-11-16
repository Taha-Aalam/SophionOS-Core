"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface ChartColumnIncreasingIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ChartColumnIncreasingIconProps
  extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const ChartColumnIncreasingIcon = forwardRef<
  ChartColumnIncreasingIconHandle,
  ChartColumnIncreasingIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

  return (
    <div
      ref={containerRef}
      className={cn(className, "c8-icon c8-icon-chart-column-increasing")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path pathLength="1"
          d="M13 17V9"
        />
        <path pathLength="1"
          d="M18 17V5"
        />
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path pathLength="1"
          d="M8 17v-3"
        />
      </svg>
    </div>
  );
});

ChartColumnIncreasingIcon.displayName = "ChartColumnIncreasingIcon";

export { ChartColumnIncreasingIcon };
