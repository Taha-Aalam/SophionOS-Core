"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface LogoutIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LogoutIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LogoutIcon = forwardRef<LogoutIconHandle, LogoutIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-logout")}
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
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline pathLength="1"
            points="16 17 21 12 16 7"
          />
          <line pathLength="1"
            x1="21"
            x2="9"
            y1="12"
            y2="12"
          />
        </svg>
      </div>
    );
  }
);

LogoutIcon.displayName = "LogoutIcon";

export { LogoutIcon };
