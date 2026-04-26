export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type Priority = typeof PRIORITY[keyof typeof PRIORITY];

export const TASK_STATUS = {
  INBOX: 'inbox',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export const PROJECT_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  ARCHIVED: 'archived',
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];

export const GOAL_TERM = {
  SHORT: 'short',
  MID: 'mid',
  LONG: 'long',
} as const;

export type GoalTerm = typeof GOAL_TERM[keyof typeof GOAL_TERM];

export const AREA_TYPE = {
  PERSONAL: 'personal',
  PROFESSIONAL: 'professional',
  HEALTH: 'health',
  FINANCE: 'finance',
  GROWTH: 'growth',
  SYSTEM: 'system',
} as const;

export type AreaType = typeof AREA_TYPE[keyof typeof AREA_TYPE];
