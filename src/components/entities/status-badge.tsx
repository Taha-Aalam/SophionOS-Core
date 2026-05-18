import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<string, string> = {
  inbox:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  todo:       'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress:'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  completed:  'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  archived:   'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

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
      className={cn('text-xs font-medium', STATUS_COLORS[status] ?? STATUS_COLORS.todo, className)}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
