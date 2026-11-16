"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface BriefcaseBusinessIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BriefcaseBusinessIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const BriefcaseBusinessIcon = forwardRef<
  BriefcaseBusinessIconHandle,
  BriefcaseBusinessIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

  return (
    <div
      ref={containerRef}
      className={cn(className, "c8-icon c8-icon-briefcase-business")}
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
        style={{ transformOrigin: "12px 4px" }}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 12h.01" />
        <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <path d="M22 13a18.15 18.15 0 0 1-20 0" />
        <rect height="14" rx="2" width="20" x="2" y="6" />
      </svg>
    </div>
  );
});

BriefcaseBusinessIcon.displayName = "BriefcaseBusinessIcon";

export { BriefcaseBusinessIcon };
