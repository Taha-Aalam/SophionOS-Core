import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn('text-xs font-medium', PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.low, className)}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}
