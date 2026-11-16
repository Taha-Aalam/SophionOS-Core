"use client";

import { useCallback, useImperativeHandle, useRef } from "react";
import type { MouseEvent, Ref } from "react";

/** Shared contract for the icon components' imperative start/stop handles. */
export interface IconAnimationHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

/**
 * Preserves the motion-era API: hover drives the animation unless a parent
 * attaches a ref, in which case only the imperative handle drives it.
 * The handle and hover both toggle one data attribute read by icons.css.
 */
export function useIconAnimation<T extends IconAnimationHandle>(
  ref: Ref<T>,
  onMouseEnter?: (event: MouseEvent<HTMLDivElement>) => void,
  onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isControlledRef = useRef(false);

  const startAnimation = useCallback(() => {
    containerRef.current?.setAttribute("data-icon-animate", "active");
  }, []);

  const stopAnimation = useCallback(() => {
    containerRef.current?.setAttribute("data-icon-animate", "inactive");
  }, []);

  useImperativeHandle(
    ref,
    () => {
      isControlledRef.current = true;
      return { startAnimation, stopAnimation } as T;
    },
    [startAnimation, stopAnimation],
  );

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) onMouseEnter?.(event);
      else startAnimation();
    },
    [onMouseEnter, startAnimation],
  );

  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) onMouseLeave?.(event);
      else stopAnimation();
    },
    [onMouseLeave, stopAnimation],
  );

  return { containerRef, handleMouseEnter, handleMouseLeave };
}
