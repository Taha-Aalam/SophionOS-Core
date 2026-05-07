import type {
  Json,
  Tables as DatabaseTable,
  TablesInsert as DatabaseInsert,
  TablesUpdate as DatabaseUpdate,
} from "./database.types";

export interface Area extends Omit<DatabaseTable<"areas">, "is_archived"> {}

export interface Goal extends DatabaseTable<"goals"> {
  linkedAreaIds?: string[];
}

export interface Note extends DatabaseTable<"notes"> {}

export interface Project extends DatabaseTable<"projects"> {
  linkedAreaIds?: string[];
}

export interface Resource extends DatabaseTable<"resources"> {
  linkedAreaIds?: string[];
  linkedGoalIds?: string[];
  linkedTaskIds?: string[];
}

export interface Topic extends Omit<DatabaseTable<"topics">, "area_id"> {
  area_id: string | null;
  inactive: boolean;
}

export interface TopicArea {
  topic_id: string;
  area_id: string;
}

export interface ResourceArea extends DatabaseTable<"resource_areas"> {}

export interface Task extends DatabaseTable<"tasks"> {
  linkedAreaIds?: string[];
}

export interface GoalProject extends DatabaseTable<"goal_projects"> {}

export interface GoalArea extends DatabaseTable<"goal_areas"> {}

export interface GoalTask extends DatabaseTable<"goal_tasks"> {}

export interface GoalNote extends DatabaseTable<"goal_notes"> {}

export interface GoalResource extends DatabaseTable<"goal_resources"> {}

export interface TaskResource {
  task_id: string;
  resource_id: string;
}

export interface AreaInsert extends Omit<DatabaseInsert<"areas">, "is_archived"> {}

export interface AreaUpdate extends Omit<DatabaseUpdate<"areas">, "is_archived"> {}

export interface GoalInsert extends DatabaseInsert<"goals"> {}

export interface GoalUpdate extends DatabaseUpdate<"goals"> {}

export interface NoteInsert extends DatabaseInsert<"notes"> {}

export interface NoteUpdate extends DatabaseUpdate<"notes"> {}

export interface ResourceInsert extends DatabaseInsert<"resources"> {}

export interface ResourceUpdate extends DatabaseUpdate<"resources"> {}

export interface TopicInsert extends DatabaseInsert<"topics"> {}

export interface TopicUpdate extends DatabaseUpdate<"topics"> {}

export interface ProjectInsert extends DatabaseInsert<"projects"> {}

export interface ProjectUpdate extends DatabaseUpdate<"projects"> {}

export interface TaskInsert extends DatabaseInsert<"tasks"> {}

export interface TaskUpdate extends DatabaseUpdate<"tasks"> {}

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
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {}

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

export interface UpdateProjectInput extends Partial<CreateProjectInput> {}

export interface CreateTaskInput {
  area_id?: string | null;
  area_ids?: string[];
  project_id?: string | null;
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
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  completed_at?: string | null;
}

export interface CreateNoteInput {
  area_id?: string | null;
  project_id?: string | null;
  topic_id?: string | null;
  name: string;
  content?: string | null;
  type?: Note["type"];
  status?: Note["status"];
  notebook?: string | null;
  favorite?: boolean;
  pin?: boolean;
  is_archived?: boolean;
  goal_ids?: string[];
}

export interface UpdateNoteInput extends Partial<CreateNoteInput> {}

export interface CreateResourceInput {
  area_id?: string | null;
  area_ids?: string[];
  project_id?: string | null;
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

export interface UpdateResourceInput extends Partial<CreateResourceInput> {}

export interface CreateTopicInput {
  area_ids?: string[];
  name: string;
  favorite?: boolean;
}

export interface UpdateTopicInput {
  name?: string;
  area_ids?: string[];
  favorite?: boolean;
}

export interface Contact extends DatabaseTable<"contacts"> {}

export interface ContactProject extends DatabaseTable<"contact_projects"> {}

export interface ContactTask extends DatabaseTable<"contact_tasks"> {}

export interface ContactInsert extends DatabaseInsert<"contacts"> {}

export interface ContactUpdate extends DatabaseUpdate<"contacts"> {}

export interface CreateContactInput {
  name: string;
  role?: string | null;
  organization?: string | null;
  group?: string | null;
  phone?: string | null;
  email?: string | null;
  linkedin?: string | null;
  website?: string | null;
  last_interaction_at?: string | null;
  follow_up_interval_days?: number | null;
  favorite?: boolean;
  notes?: string | null;
  metadata?: Json;
}

export interface UpdateContactInput extends Partial<CreateContactInput> {
  archive?: boolean;
}

export type FollowUpStatus = "ON TRACK" | "FOLLOW UP";

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
