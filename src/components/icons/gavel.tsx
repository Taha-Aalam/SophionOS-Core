"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface GavelIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface GavelIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const GavelIcon = forwardRef<GavelIconHandle, GavelIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-gavel")}
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
          style={{ transformOrigin: "0% 100%", transformBox: "fill-box" }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m14 13-8.381 8.38a1 1 0 0 1-3.001-3l8.384-8.381" />
          <path d="m16 16 6-6" />
          <path d="m21.5 10.5-8-8" />
          <path d="m8 8 6-6" />
          <path d="m8.5 7.5 8 8" />
        </svg>
      </div>
    );
  }
);

GavelIcon.displayName = "GavelIcon";

export { GavelIcon };
