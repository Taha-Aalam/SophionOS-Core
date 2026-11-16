"use client";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useIconAnimation } from "./use-icon-animation";
import "./icons.css";
import { cn } from "@/lib/utils";

export interface MailboxIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MailboxIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const MailboxIcon = forwardRef<MailboxIconHandle, MailboxIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const { containerRef, handleMouseEnter, handleMouseLeave } =
      useIconAnimation(ref, onMouseEnter, onMouseLeave);

    return (
      <div
        ref={containerRef}
        className={cn(className, "c8-icon c8-icon-mailbox")}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          className="overflow-visible"
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
          <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" />
          <path pathLength="1"
            d="M18 11V9H15"
            style={{ transformOrigin: "18px 11px" }}
          />
          <path d="M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2" />
          <line x1="6" x2="7" y1="10" y2="10" />
        </svg>
      </div>
    );
  }
);

MailboxIcon.displayName = "MailboxIcon";

export { MailboxIcon };
