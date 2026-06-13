export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      areas: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          type: string;
          metadata: Json;
          is_archived: boolean | null;
          inactive: boolean;
          archive: boolean;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          type?: string;
          metadata?: Json;
          is_archived?: boolean | null;
          inactive?: boolean;
          archive?: boolean;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          type?: string;
          metadata?: Json;
          is_archived?: boolean | null;
          inactive?: boolean;
          archive?: boolean;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          area_id: string | null;
          name: string;
          description: string | null;
          term: Database["public"]["Enums"]["goal_term"];
          priority: Database["public"]["Enums"]["priority"];
          target_date: string | null;
          progress: number;
          is_completed: boolean;
          is_archived: boolean;
          is_inactive: boolean;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          area_id?: string | null;
          name: string;
          description?: string | null;
          term: Database["public"]["Enums"]["goal_term"];
          priority?: Database["public"]["Enums"]["priority"];
          target_date?: string | null;
          progress?: number;
          is_completed?: boolean;
          is_archived?: boolean;
          is_inactive?: boolean;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          area_id?: string | null;
          name?: string;
          description?: string | null;
          term?: Database["public"]["Enums"]["goal_term"];
          priority?: Database["public"]["Enums"]["priority"];
          target_date?: string | null;
          progress?: number;
          is_completed?: boolean;
          is_archived?: boolean;
          is_inactive?: boolean;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      goal_projects: {
        Row: {
          goal_id: string;
          project_id: string;
        };
        Insert: {
          goal_id: string;
          project_id: string;
        };
        Update: {
          goal_id?: string;
          project_id?: string;
        };
      };
      goal_areas: {
        Row: {
          goal_id: string;
          area_id: string;
        };
        Insert: {
          goal_id: string;
          area_id: string;
        };
        Update: {
          goal_id?: string;
          area_id?: string;
        };
      };
      goal_tasks: {
        Row: {
          goal_id: string;
          task_id: string;
        };
        Insert: {
          goal_id: string;
          task_id: string;
        };
        Update: {
          goal_id?: string;
          task_id?: string;
        };
      };
      goal_notes: {
        Row: {
          goal_id: string;
          note_id: string;
        };
        Insert: {
          goal_id: string;
          note_id: string;
        };
        Update: {
          goal_id?: string;
          note_id?: string;
        };
      };
      goal_resources: {
        Row: {
          goal_id: string;
          resource_id: string;
        };
        Insert: {
          goal_id: string;
          resource_id: string;
        };
        Update: {
          goal_id?: string;
          resource_id?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          area_id: string | null;
          project_id: string | null;
          topic_id: string | null;
          name: string;
          slug: string | null;
          content: string | null;
          type: string;
          status: Database["public"]["Enums"]["note_status"];
          favorite: boolean;
          pin: boolean;
          is_archived: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          area_id?: string | null;
          project_id?: string | null;
          topic_id?: string | null;
          name: string;
          slug?: string | null;
          content?: string | null;
          type?: string;
          status?: Database["public"]["Enums"]["note_status"];
          favorite?: boolean;
          pin?: boolean;
          is_archived?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          area_id?: string | null;
          project_id?: string | null;
          topic_id?: string | null;
          name?: string;
          slug?: string | null;
          content?: string | null;
          type?: string;
          status?: Database["public"]["Enums"]["note_status"];
          favorite?: boolean;
          pin?: boolean;
          is_archived?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          area_id: string | null;
          name: string;
          description: string | null;
          status: Database["public"]["Enums"]["project_status"];
          priority: Database["public"]["Enums"]["priority"];
          start_date: string | null;
          due_date: string | null;
          progress: number;
          is_archived: boolean;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          area_id?: string | null;
          name: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          priority?: Database["public"]["Enums"]["priority"];
          start_date?: string | null;
          due_date?: string | null;
          progress?: number;
          is_archived?: boolean;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          area_id?: string | null;
          name?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          priority?: Database["public"]["Enums"]["priority"];
          start_date?: string | null;
          due_date?: string | null;
          progress?: number;
          is_archived?: boolean;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      resources: {
        Row: {
          id: string;
          user_id: string;
          area_id: string | null;
          topic_id: string | null;
          name: string;
          url: string | null;
          type: Database["public"]["Enums"]["resource_type"];
          status: Database["public"]["Enums"]["resource_status"];
          favorite: boolean;
          is_archived: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          area_id?: string | null;
          topic_id?: string | null;
          name: string;
          url?: string | null;
          type?: Database["public"]["Enums"]["resource_type"];
          status?: Database["public"]["Enums"]["resource_status"];
          favorite?: boolean;
          is_archived?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          area_id?: string | null;
          topic_id?: string | null;
          name?: string;
          url?: string | null;
          type?: Database["public"]["Enums"]["resource_type"];
          status?: Database["public"]["Enums"]["resource_status"];
          favorite?: boolean;
          is_archived?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      resource_areas: {
        Row: {
          resource_id: string;
          area_id: string;
        };
        Insert: {
          resource_id: string;
          area_id: string;
        };
        Update: {
          resource_id?: string;
          area_id?: string;
        };
      };
      resource_projects: {
        Row: {
          resource_id: string;
          project_id: string;
        };
        Insert: {
          resource_id: string;
          project_id: string;
        };
        Update: {
          resource_id?: string;
          project_id?: string;
        };
      };
      topics: {
        Row: {
          id: string;
          user_id: string;
          area_id: string | null;
          name: string;
          favorite: boolean;
          inactive: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          area_id?: string | null;
          name: string;
          favorite?: boolean;
          inactive?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          area_id?: string | null;
          name?: string;
          favorite?: boolean;
          inactive?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      topic_areas: {
        Row: {
          topic_id: string;
          area_id: string;
        };
        Insert: {
          topic_id: string;
          area_id: string;
        };
        Update: {
          topic_id?: string;
          area_id?: string;
        };
      };
      task_areas: {
        Row: {
          task_id: string;
          area_id: string;
        };
        Insert: {
          task_id: string;
          area_id: string;
        };
        Update: {
          task_id?: string;
          area_id?: string;
        };
      };
      task_projects: {
        Row: {
          task_id: string;
          project_id: string;
        };
        Insert: {
          task_id: string;
          project_id: string;
        };
        Update: {
          task_id?: string;
          project_id?: string;
        };
      };
      task_notes: {
        Row: {
          task_id: string;
          note_id: string;
        };
        Insert: {
          task_id: string;
          note_id: string;
        };
        Update: {
          task_id?: string;
          note_id?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          area_id: string | null;
          project_id: string | null;
          name: string;
          description: string | null;
          status: Database["public"]["Enums"]["task_status"];
          priority: Database["public"]["Enums"]["priority"];
          due_date: string | null;
          is_completed: boolean;
          is_focused: boolean;
          is_important: boolean;
          is_urgent: boolean;
          completed_at: string | null;
          previous_status: Database["public"]["Enums"]["task_status"] | null;
          smart_priority: number;
          is_archived: boolean;
          is_recurring: boolean;
          repeat_every: number | null;
          repeat_cycle: Database["public"]["Enums"]["task_repeat_cycle"] | null;
          recurrence_source_task_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          area_id?: string | null;
          project_id?: string | null;
          name: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          priority?: Database["public"]["Enums"]["priority"];
          due_date?: string | null;
          is_completed?: boolean;
          is_focused?: boolean;
          is_important?: boolean;
          is_urgent?: boolean;
          completed_at?: string | null;
          previous_status?: Database["public"]["Enums"]["task_status"] | null;
          smart_priority?: number;
          is_archived?: boolean;
          is_recurring?: boolean;
          repeat_every?: number | null;
          repeat_cycle?: Database["public"]["Enums"]["task_repeat_cycle"] | null;
          recurrence_source_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          area_id?: string | null;
          project_id?: string | null;
          name?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          priority?: Database["public"]["Enums"]["priority"];
          due_date?: string | null;
          is_completed?: boolean;
          is_focused?: boolean;
          is_important?: boolean;
          is_urgent?: boolean;
          completed_at?: string | null;
          previous_status?: Database["public"]["Enums"]["task_status"] | null;
          smart_priority?: number;
          is_archived?: boolean;
          is_recurring?: boolean;
          repeat_every?: number | null;
          repeat_cycle?: Database["public"]["Enums"]["task_repeat_cycle"] | null;
          recurrence_source_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string | null;
          role: string | null;
          organization: string | null;
          group: string | null;
          phone: string | null;
          email: string | null;
          linkedin: string | null;
          website: string | null;
          image_url: string | null;
          last_interaction_at: string | null;
          follow_up_interval_days: number | null;
          favorite: boolean;
          notes: string | null;
          archive: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug?: string | null;
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
          archive?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string | null;
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
          archive?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_projects: {
        Row: {
          contact_id: string;
          project_id: string;
          role_in_project: string | null;
        };
        Insert: {
          contact_id: string;
          project_id: string;
          role_in_project?: string | null;
        };
        Update: {
          contact_id?: string;
          project_id?: string;
          role_in_project?: string | null;
        };
      };
      contact_tasks: {
        Row: {
          contact_id: string;
          task_id: string;
          role_in_task: string | null;
        };
        Insert: {
          contact_id: string;
          task_id: string;
          role_in_task?: string | null;
        };
        Update: {
          contact_id?: string;
          task_id?: string;
          role_in_task?: string | null;
        };
      };
      contact_logs: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          message: string;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          message: string;
          logged_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          message?: string;
          logged_at?: string;
          created_at?: string;
        };
      };
      contact_areas: {
        Row: {
          contact_id: string;
          area_id: string;
        };
        Insert: {
          contact_id: string;
          area_id: string;
        };
        Update: {
          contact_id?: string;
          area_id?: string;
        };
      };
      contact_goals: {
        Row: {
          contact_id: string;
          goal_id: string;
        };
        Insert: {
          contact_id: string;
          goal_id: string;
        };
        Update: {
          contact_id?: string;
          goal_id?: string;
        };
      };
      note_areas: {
        Row: {
          note_id: string;
          area_id: string;
        };
        Insert: {
          note_id: string;
          area_id: string;
        };
        Update: {
          note_id?: string;
          area_id?: string;
        };
      };
      note_projects: {
        Row: {
          note_id: string;
          project_id: string;
        };
        Insert: {
          note_id: string;
          project_id: string;
        };
        Update: {
          note_id?: string;
          project_id?: string;
        };
      };
      note_notebooks: {
        Row: {
          note_id: string;
          notebook: string;
          created_at: string;
        };
        Insert: {
          note_id: string;
          notebook: string;
          created_at?: string;
        };
        Update: {
          note_id?: string;
          notebook?: string;
          created_at?: string;
        };
      };
      note_types: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          key: string;
          value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          key: string;
          value?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          key?: string;
          value?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      goal_term: "short" | "mid" | "long";
      note_status: "inbox" | "to_review" | "active" | "archive" | "completed";
      note_type: "note" | "research" | "journal";
      priority: "low" | "medium" | "high";
      project_status: "inbox" | "planning" | "active" | "completed" | "on_hold" | "archived";
      resource_status: "inbox" | "to_review" | "active" | "completed";
      resource_type: "website" | "article" | "video" | "document" | "podcast" | "social_media" | "tool";
      task_status: "inbox" | "todo" | "in_progress" | "completed" | "archived";
      task_repeat_cycle:
        | "days"
        | "weeks"
        | "months"
        | "years"
        | "months_first_weekday"
        | "months_last_weekday"
        | "months_second_saturday"
        | "months_last_day";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Row"];

export type TablesInsert<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Insert"];

export type TablesUpdate<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Update"];

export type Enums<EnumName extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][EnumName];
