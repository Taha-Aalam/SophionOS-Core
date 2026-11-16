"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface Link2OffIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface Link2OffIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const Link2OffIcon = forwardRef<Link2OffIconHandle, Link2OffIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-link-2-off")}
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
          <path d="M9 17H7A5 5 0 0 1 7 7" />
          <path d="M15 7h2a5 5 0 0 1 4 8" />
          <line x1="8" x2="12" y1="12" y2="12" />
          <line pathLength="1"
            x1="2"
            x2="22"
            y1="2"
            y2="22"
          />
        </svg>
      </div>
    );
  }
);

Link2OffIcon.displayName = "Link2OffIcon";

export { Link2OffIcon };
