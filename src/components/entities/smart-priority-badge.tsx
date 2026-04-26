import { cn } from '@/lib/utils';

const SCORE_COLORS: Record<number, string> = {
  5: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  4: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  3: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  1: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

interface SmartPriorityBadgeProps {
  score: number;
  className?: string;
}

export function SmartPriorityBadge({ score, className }: SmartPriorityBadgeProps) {
  const clamped = Math.max(1, Math.min(5, score));
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full w-5 h-5 text-xs font-bold shrink-0',
        SCORE_COLORS[clamped] ?? SCORE_COLORS[1],
        className
      )}
      title={`Smart priority: ${clamped}/5`}
    >
      {clamped}
    </span>
  );
}
