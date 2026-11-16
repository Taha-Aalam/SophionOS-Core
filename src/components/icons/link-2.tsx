"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface Link2IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface Link2IconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}


const Link2Icon = forwardRef<Link2IconHandle, Link2IconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-link-2")}
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
            <path d="M9 17H7A5 5 0 0 1 7 7h2" />
            <line x1="8" x2="12" y1="12" y2="12" />
          </g>
          <g>
            <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
            <line x1="16" x2="12" y1="12" y2="12" />
          </g>
        </svg>
      </div>
    );
  }
);

Link2Icon.displayName = "Link2Icon";

export { Link2Icon };
