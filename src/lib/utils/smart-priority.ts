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
  // Due date proximity (30%): 1.5 if overdue, scaled 0–1.5 within 14 days
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
    if (diffDays <= 0) {
      dueWeight = 1.5;
    } else {
      dueWeight = Math.max(0, 1.5 - (diffDays / 14) * 1.5);
    }
  }

  // Priority level (25%): high=1.25, medium=0.75, low=0.25
  const priWeights: Record<Priority, number> = {
    high: 1.25,
    medium: 0.75,
    low: 0.25,
  };
  const priWeight = priWeights[input.priority] ?? 0.75;

  // Goal alignment (25% budget, shared with project alignment)
  // Goals: 0.5 per goal, capped at 1.25
  // Projects: 0.25 per project, capped at 0.75 (weaker signal than direct goals)
  // Combined cap at 1.25 — projects supplement goals, they don't replace them
  const goalWeight = Math.min(1.25, input.goalCount * 0.5);
  const projectWeight = Math.min(0.75, input.projectCount * 0.25);
  const alignmentWeight = Math.min(1.25, goalWeight + projectWeight);

  // Eisenhower (20%): both=1.0, important=0.7, urgent=0.5, neither=0
  let eisWeight: number;
  if (input.isImportant && input.isUrgent) {
    eisWeight = 1.0;
  } else if (input.isImportant) {
    eisWeight = 0.7;
  } else if (input.isUrgent) {
    eisWeight = 0.5;
  } else {
    eisWeight = 0;
  }

  const score = dueWeight + priWeight + alignmentWeight + eisWeight;
  return Math.max(1, Math.min(5, Math.round(score)));
}
