import type {
  Json,
  Tables as DatabaseTable,
  TablesInsert as DatabaseInsert,
  TablesUpdate as DatabaseUpdate,
} from "./database.types";

export interface Area extends Omit<DatabaseTable<"areas">, "is_archived"> {}

export interface Goal extends DatabaseTable<"goals"> {}

export interface Project extends DatabaseTable<"projects"> {}

export interface Task extends DatabaseTable<"tasks"> {}

export interface GoalProject extends DatabaseTable<"goal_projects"> {}

export interface GoalTask extends DatabaseTable<"goal_tasks"> {}

export interface AreaInsert extends Omit<DatabaseInsert<"areas">, "is_archived"> {}

export interface AreaUpdate extends Omit<DatabaseUpdate<"areas">, "is_archived"> {}

export interface GoalInsert extends DatabaseInsert<"goals"> {}

export interface GoalUpdate extends DatabaseUpdate<"goals"> {}

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
