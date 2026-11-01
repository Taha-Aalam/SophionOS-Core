"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface CrosshairIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CrosshairIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const TICK_VARIANTS: Variants = {
  normal: { opacity: 1 },
  animate: (i: number) => ({
    opacity: [0, 1],
    transition: { delay: i * 0.1, duration: 0.3 },
  }),
};

const CrosshairIcon = forwardRef<CrosshairIconHandle, CrosshairIconProps>(
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
          <circle cx="12" cy="12" r="10" />
          {[
            { x1: 22, x2: 18, y1: 12, y2: 12 },
            { x1: 6, x2: 2, y1: 12, y2: 12 },
            { x1: 12, x2: 12, y1: 6, y2: 2 },
            { x1: 12, x2: 12, y1: 22, y2: 18 },
          ].map((tick, index) => (
            <motion.line
              animate={controls}
              custom={index + 1}
              key={index}
              variants={TICK_VARIANTS}
              x1={tick.x1}
              x2={tick.x2}
              y1={tick.y1}
              y2={tick.y2}
            />
          ))}
        </svg>
      </div>
    );
  }
);

CrosshairIcon.displayName = "CrosshairIcon";

export { CrosshairIcon };
