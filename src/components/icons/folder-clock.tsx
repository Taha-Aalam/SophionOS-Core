"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface FolderClockIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface FolderClockIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}



const FolderClockIcon = forwardRef<FolderClockIconHandle, FolderClockIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-folder-clock")}
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
          <path d="M7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2" />

          <circle cx="16" cy="16" r="6" />
          <line pathLength="1"
            x1="16"
            x2="16"
            y1="16"
            y2="13"
          />
          <line pathLength="1"
            x1="16"
            x2="18.5"
            y1="16"
            y2="16"
          />
        </svg>
      </div>
    );
  }
);

FolderClockIcon.displayName = "FolderClockIcon";

export { FolderClockIcon };
