"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface CrosshairIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CrosshairIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CrosshairIcon = forwardRef<CrosshairIconHandle, CrosshairIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-crosshair")}
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
          <circle cx="12" cy="12" r="10" />
          {[
            { x1: 22, x2: 18, y1: 12, y2: 12 },
            { x1: 6, x2: 2, y1: 12, y2: 12 },
            { x1: 12, x2: 12, y1: 6, y2: 2 },
            { x1: 12, x2: 12, y1: 22, y2: 18 },
          ].map((tick, index) => (
            <line pathLength="1"
              key={index}
              x1={tick.x1}
              x2={tick.x2}
              y1={tick.y1}
              y2={tick.y2}
            />
          ))}
        </svg>
      </div>
    );
  }
);

CrosshairIcon.displayName = "CrosshairIcon";

export { CrosshairIcon };
