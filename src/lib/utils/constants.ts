export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
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
  INBOX: 'inbox',
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

/**
 * Backstop cap applied to every "list all" query. The app derives most views
 * (tabs, grouping, counts) client-side over a full in-memory result, so true
 * pagination is not viable without moving that logic server-side. This cap
 * only guards against pathological payload growth — normal workloads never
 * approach it. If a real user hits it, that's the signal to invest in proper
 * server-side pagination for that entity.
 */
export const LIST_SAFETY_CAP = 2000;


export const AREA_TYPE = {
  PERSONAL: 'personal',
  PROFESSIONAL: 'professional',
  HEALTH: 'health',
  FINANCE: 'finance',
  GROWTH: 'growth',
  SYSTEM: 'system',
} as const;

export type AreaType = typeof AREA_TYPE[keyof typeof AREA_TYPE];

export const NOTE_STATUS = {
  INBOX: 'inbox',
  TO_REVIEW: 'to_review',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVE: 'archive',
} as const;

export type NoteStatus = typeof NOTE_STATUS[keyof typeof NOTE_STATUS];

export const NOTE_TYPE = {
  NOTE: 'note',
  RESEARCH: 'research',
  JOURNAL: 'journal',
} as const;

export type NoteType = typeof NOTE_TYPE[keyof typeof NOTE_TYPE];

export const RESOURCE_STATUS = {
  INBOX: 'inbox',
  TO_REVIEW: 'to_review',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

export type ResourceStatus = typeof RESOURCE_STATUS[keyof typeof RESOURCE_STATUS];

export const RESOURCE_TYPE = {
  WEBSITE: 'website',
  ARTICLE: 'article',
  VIDEO: 'video',
  DOCUMENT: 'document',
  PODCAST: 'podcast',
  SOCIAL_MEDIA: 'social_media',
  TOOL: 'tool',
} as const;

export type ResourceType = typeof RESOURCE_TYPE[keyof typeof RESOURCE_TYPE];

export {
  TASK_REPEAT_CYCLE,
  TASK_REPEAT_CYCLE_OPTIONS,
  type TaskRepeatCycle,
} from "./task-recurrence";
