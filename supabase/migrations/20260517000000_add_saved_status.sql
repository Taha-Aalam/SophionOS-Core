-- Add 'saved' to note_status and resource_status enums
ALTER TYPE note_status ADD VALUE IF NOT EXISTS 'saved';
ALTER TYPE resource_status ADD VALUE IF NOT EXISTS 'saved';
