"use client";

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

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
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { opacity: 1, pathLength: 1 },
              animate: {
                opacity: [0, 1],
                pathLength: [0, 1],
                transition: { duration: 0.35, ease: "easeOut" },
              },
            }}
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
