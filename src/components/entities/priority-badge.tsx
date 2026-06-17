import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_COLORS, PRIORITY_FALLBACK } from '@/lib/constants/entity-colors';

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
      className={cn('text-xs font-medium', PRIORITY_COLORS[priority] ?? PRIORITY_FALLBACK, className)}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}
