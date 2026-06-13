import type {
  TablesInsert as DatabaseInsert,
  Tables as DatabaseTable,
  TablesUpdate as DatabaseUpdate,
  Json,
} from "./database.types";

export type Area = Omit<DatabaseTable<"areas">, "is_archived">;

export interface Goal extends DatabaseTable<"goals"> {
  linkedAreaIds?: string[];
  projectCount?: number;
  taskCount?: number;
  noteCount?: number;
  resourceCount?: number;
}

export interface Note extends Omit<DatabaseTable<"notes">, "notebook"> {
  notebook?: string | null;
  linkedAreaIds?: string[];
  linkedGoalIds?: string[];
  linkedProjectIds?: string[];
  linkedTaskIds?: string[];
  notebooks?: string[];
}

export interface RelatedNotebookGroup {
  notebook: string;
  notes: Note[];
}

export interface Project extends DatabaseTable<"projects"> {
  linkedAreaIds?: string[];
  linkedGoalIds?: string[];
  goalCount?: number;
  taskCount?: number;
  noteCount?: number;
  resourceCount?: number;
}

export interface Resource extends DatabaseTable<"resources"> {
  linkedAreaIds?: string[];
  linkedGoalIds?: string[];
  linkedProjectIds?: string[];
  linkedTaskIds?: string[];
}

export interface Topic extends Omit<DatabaseTable<"topics">, "area_id"> {
  area_id: string | null;
  inactive: boolean;
  is_archived: boolean;
  slug?: string | null;
}

export interface TopicArea {
  topic_id: string;
  area_id: string;
}

export type ResourceArea = DatabaseTable<"resource_areas">;

export interface Task extends DatabaseTable<"tasks"> {
  linkedAreaIds?: string[];
  linkedGoalIds?: string[];
  linkedProjectIds?: string[];
}

export type GoalProject = DatabaseTable<"goal_projects">;

export type GoalArea = DatabaseTable<"goal_areas">;

export type GoalTask = DatabaseTable<"goal_tasks">;

export type GoalNote = DatabaseTable<"goal_notes">;

export type GoalResource = DatabaseTable<"goal_resources">;

export interface TaskResource {
  task_id: string;
  resource_id: string;
}

export type AreaInsert = Omit<DatabaseInsert<"areas">, "is_archived">;

export type AreaUpdate = Omit<DatabaseUpdate<"areas">, "is_archived">;

export type GoalInsert = DatabaseInsert<"goals">;

export type GoalUpdate = DatabaseUpdate<"goals">;

export type NoteInsert = DatabaseInsert<"notes">;

export type NoteUpdate = DatabaseUpdate<"notes">;

export type ResourceInsert = DatabaseInsert<"resources">;

export type ResourceUpdate = DatabaseUpdate<"resources">;

export type TopicInsert = DatabaseInsert<"topics">;

export type TopicUpdate = DatabaseUpdate<"topics">;

export type ProjectInsert = DatabaseInsert<"projects">;

export type ProjectUpdate = DatabaseUpdate<"projects">;

export type TaskInsert = DatabaseInsert<"tasks">;

export type TaskUpdate = DatabaseUpdate<"tasks">;

export interface CreateAreaInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  type?: string;
  slug?: string;
  metadata?: Json;
}

export interface UpdateAreaInput extends Partial<CreateAreaInput> {
  archive?: boolean;
  inactive?: boolean;
}

export interface CreateGoalInput {
  area_id?: string | null;
  area_ids?: string[];
  name: string;
  description?: string | null;
  term: Goal["term"];
  priority?: Goal["priority"];
  target_date?: string | null;
  progress?: number;
  is_completed?: boolean;
  is_archived?: boolean;
  is_inactive?: boolean;
}

export type UpdateGoalInput = Partial<CreateGoalInput>;

export interface CreateProjectInput {
  area_id?: string | null;
  area_ids?: string[];
  name: string;
  description?: string | null;
  status?: Project["status"];
  priority?: Project["priority"];
  start_date?: string | null;
  due_date?: string | null;
  progress?: number;
  is_archived?: boolean;
  goal_ids?: string[];
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

export interface CreateTaskInput {
  area_id?: string | null;
  area_ids?: string[];
  project_id?: string | null;
  project_ids?: string[];
  name: string;
  description?: string | null;
  status?: Task["status"];
  priority?: Task["priority"];
  due_date?: string | null;
  is_completed?: boolean;
  is_focused?: boolean;
  is_important?: boolean;
  is_urgent?: boolean;
  is_archived?: boolean;
  goal_ids?: string[];
  is_recurring?: boolean;
  repeat_every?: number | null;
  repeat_cycle?: Task["repeat_cycle"];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  completed_at?: string | null;
}

export interface CreateNoteInput {
  area_id?: string | null;
  area_ids?: string[];
  project_id?: string | null;
  project_ids?: string[];
  topic_id?: string | null;
  name: string;
  content?: string | null;
  type?: string;
  status?: Note["status"];
  notebooks?: string[];
  favorite?: boolean;
  pin?: boolean;
  is_archived?: boolean;
  goal_ids?: string[];
  task_ids?: string[];
}

export type UpdateNoteInput = Partial<CreateNoteInput>;

export interface CreateResourceInput {
  area_id?: string | null;
  area_ids?: string[];
  project_ids?: string[];
  topic_id?: string | null;
  name: string;
  url?: string | null;
  type?: Resource["type"];
  status?: Resource["status"];
  favorite?: boolean;
  is_archived?: boolean;
  goal_ids?: string[];
  task_ids?: string[];
}

export type UpdateResourceInput = Partial<CreateResourceInput>;

export interface CreateTopicInput {
  area_ids?: string[];
  note_ids?: string[];
  resource_ids?: string[];
  name: string;
  favorite?: boolean;
}

export interface UpdateTopicInput {
  name?: string;
  area_ids?: string[];
  note_ids?: string[];
  resource_ids?: string[];
  favorite?: boolean;
}

export interface Contact extends DatabaseTable<"contacts"> {
  linkedAreaIds?: string[];
  linkedGoalIds?: string[];
  linkedProjectIds?: string[];
  linkedTaskIds?: string[];
}

export type ContactProject = DatabaseTable<"contact_projects">;

export type ContactTask = DatabaseTable<"contact_tasks">;

export type ContactInsert = DatabaseInsert<"contacts">;

export type ContactUpdate = DatabaseUpdate<"contacts">;

export interface CreateContactInput {
  name: string;
  role?: string | null;
  organization?: string | null;
  group?: string | null;
  phone?: string | null;
  email?: string | null;
  linkedin?: string | null;
  website?: string | null;
  image_url?: string | null;
  last_interaction_at?: string | null;
  follow_up_interval_days?: number | null;
  favorite?: boolean;
  notes?: string | null;
  metadata?: Json;
  area_ids?: string[];
  goal_ids?: string[];
  project_ids?: string[];
  task_ids?: string[];
}

export interface UpdateContactInput extends Partial<CreateContactInput> {
  archive?: boolean;
}

export type FollowUpStatus = "ON TRACK" | "FOLLOW UP";

export interface ContactLog {
  id: string;
  user_id: string;
  contact_id: string;
  message: string;
  logged_at: string;
  created_at: string;
}

export interface CreateContactLogInput {
  message: string;
}

export interface ContactWithRelations extends Contact {
  linked_projects: Array<{
    project_id: string;
    role_in_project: string | null;
  }>;
  linked_tasks: Array<{
    task_id: string;
    role_in_task: string | null;
  }>;
}
