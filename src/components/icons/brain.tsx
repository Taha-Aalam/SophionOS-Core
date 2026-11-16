"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface BrainIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BrainIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}



const BrainIcon = forwardRef<BrainIconHandle, BrainIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-brain")}
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
          strokeWidth={2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path pathLength="1"
            d="M12 18V5"
          />
          <path pathLength="1"
            d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"
          />

          <path pathLength="1"
            d="M12 5A3 3 0 1 1 17.598 6.5"
          />
          <path pathLength="1"
            d="M12 5A3 3 0 1 0 6.402 6.5"
          />

          <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />

          <path pathLength="1"
            d="M18 18a4 4 0 0 0 2-7.464"
          />

          <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />

          <path pathLength="1"
            d="M6 18a4 4 0 0 1-2-7.464"
          />
          <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
        </svg>
      </div>
    );
  }
);

BrainIcon.displayName = "BrainIcon";

export { BrainIcon };
