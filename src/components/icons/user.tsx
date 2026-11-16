"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface UserIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UserIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}


const UserIcon = forwardRef<UserIconHandle, UserIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-user")}
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
          <circle pathLength="1"
            cx="12"
            cy="8"
            r="5"
          />

          <path pathLength="1"
            d="M20 21a8 8 0 0 0-16 0"
          />
        </svg>
      </div>
    );
  }
);

UserIcon.displayName = "UserIcon";

export { UserIcon };
