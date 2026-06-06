import { Priority } from '@/lib/utils/constants';

export interface SmartPriorityInput {
  priority: Priority;
  dueDate?: string | null;
  goalCount: number;
  projectCount: number;
  isImportant: boolean;
  isUrgent: boolean;
}

// Client-side mirror of calc_smart_priority() PostgreSQL function.
// DB is source of truth; this is for display/preview only.
export function calculateSmartPriority(input: SmartPriorityInput): number {
  // Due date proximity:
  //   - no date: 0.5 (neutral)
  //   - today: 1.5
  //   - 1–7 days overdue: 1.25
  //   - >7 days overdue: 1.75
  //   - future: linear decay 1.5→0.5 over 14 days, floored at 0.5
  // Final score clamps to 1–5.
  let dueWeight: number;
  if (!input.dueDate) {
    dueWeight = 0.5;
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const raw = input.dueDate.split('T')[0];
    const [y, m, d] = raw.split('-').map(Number);
    const dueDay = new Date(y, m - 1, d);
    const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
    if (diffDays < -7) {
      dueWeight = 1.75;
    } else if (diffDays <= 0) {
      // today (0) through 7 days overdue
      dueWeight = diffDays === 0 ? 1.5 : 1.25;
    } else {
      dueWeight = Math.max(0.5, 1.5 - (diffDays / 14) * 1.5);
    }
  }

  // Priority level (25%): high=1.25, medium=0.75, low=0.25
  const priWeights: Record<Priority, number> = {
    high: 1.25,
    medium: 0.75,
    low: 0.25,
  };
  const priWeight = priWeights[input.priority] ?? 0.75;

  // Goal + project alignment (cap 1.0):
  //   - goal: 0.5 each
  //   - project: 0.25 each (weaker signal than direct goals)
  const alignmentWeight = Math.min(1.0, input.goalCount * 0.5 + input.projectCount * 0.25);

  // Eisenhower (cap 1.25): both=1.25, important=0.7, urgent=0.7, neither=0
  let eisWeight: number;
  if (input.isImportant && input.isUrgent) {
    eisWeight = 1.25;
  } else if (input.isImportant) {
    eisWeight = 0.7;
  } else if (input.isUrgent) {
    eisWeight = 0.7;
  } else {
    eisWeight = 0;
  }

  const score = dueWeight + priWeight + alignmentWeight + eisWeight;
  const clamped = Math.max(1, Math.min(5, score));
  return clamped > 4.5 ? 5 : Math.round(clamped);
}
