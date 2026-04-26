import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

export default function ProgressRing({
  percentage,
  size = 64,
  strokeWidth = 8,
  className,
  color = 'text-primary',
}: ProgressRingProps) {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted-foreground/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-500 ease-out", color)}
        />
      </svg>
      <span className="absolute text-xs font-bold">
        {Math.round(clampedPercentage)}%
      </span>
    </div>
  );
}
