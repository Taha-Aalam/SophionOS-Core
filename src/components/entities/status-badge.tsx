import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS, STATUS_FALLBACK } from '@/lib/constants/entity-colors';

const STATUS_LABELS: Record<string, string> = {
  inbox:      'Inbox',
  todo:       'Todo',
  in_progress:'In Progress',
  completed:  'Done',
  archived:   'Archived',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn('text-xs font-medium', STATUS_COLORS[status] ?? STATUS_FALLBACK, className)}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
