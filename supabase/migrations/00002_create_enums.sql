-- Enums for core entities
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('inbox', 'todo', 'in_progress', 'completed', 'archived');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'on_hold', 'archived');
CREATE TYPE goal_term AS ENUM ('short', 'mid', 'long');
CREATE TYPE area_type AS ENUM ('personal', 'professional', 'health', 'finance', 'growth', 'system');
