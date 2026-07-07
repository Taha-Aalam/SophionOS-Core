import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { SCORE_COLORS } from '@/lib/constants/entity-colors';

interface SmartPriorityBadgeProps {
  score: number;
  className?: string;
}

export function SmartPriorityBadge({ score, className }: SmartPriorityBadgeProps) {
  const clamped = Math.max(1, Math.min(5, score));
  return (
    <Badge
      variant="secondary"
      className={cn('text-xs font-bold shrink-0', SCORE_COLORS[clamped] ?? SCORE_COLORS[1], className)}
      title={`Smart priority: ${clamped}/5`}
    >
      {clamped}
    </Badge>
  );
}
