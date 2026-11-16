"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface HeartPulseIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface HeartPulseIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}



const HeartPulseIcon = forwardRef<HeartPulseIconHandle, HeartPulseIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-heart-pulse")}
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
          <g>
            <path pathLength="1"
              d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
            />
          </g>
          <path pathLength="1"
            d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"
          />
        </svg>
      </div>
    );
  }
);

HeartPulseIcon.displayName = "HeartPulseIcon";

export { HeartPulseIcon };
