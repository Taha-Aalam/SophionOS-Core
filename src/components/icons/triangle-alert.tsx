"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface TriangleAlertIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface TriangleAlertIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const TriangleAlertIcon = forwardRef<TriangleAlertIconHandle, TriangleAlertIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-triangle-alert")}
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
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <g>
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </g>
        </svg>
      </div>
    );
  }
);

TriangleAlertIcon.displayName = "TriangleAlertIcon";

export { TriangleAlertIcon };
