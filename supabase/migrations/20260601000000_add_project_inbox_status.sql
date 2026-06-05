-- Add a real 'inbox' value to project_status so projects are symmetric with
-- tasks/notes/resources. Previously the project "inbox" was faked as 'planning'.
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'inbox' BEFORE 'planning';
