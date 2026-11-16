"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";

import { cn } from "@/lib/utils";

export interface BookTextIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BookTextIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const BookTextIcon = forwardRef<BookTextIconHandle, BookTextIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-book-text")}
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
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
          <path d="M8 11h8" />
          <path d="M8 7h6" />
        </svg>
      </div>
    );
  }
);

BookTextIcon.displayName = "BookTextIcon";

export { BookTextIcon };
