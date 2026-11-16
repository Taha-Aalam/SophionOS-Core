"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface CheckCheckIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CheckCheckIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CheckCheckIcon = forwardRef<CheckCheckIconHandle, CheckCheckIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-check-check")}
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
            d="M2 12 7 17L18 6"
          />
          <path pathLength="1"
            d="M13 16L14.5 17.5L22 10"
          />
        </svg>
      </div>
    );
  }
);

CheckCheckIcon.displayName = "CheckCheckIcon";

export { CheckCheckIcon };
