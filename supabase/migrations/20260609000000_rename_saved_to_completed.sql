-- Rename 'saved' to 'completed' in note_status and resource_status enums
-- Existing DB records with 'saved' will now show as 'completed'

ALTER TYPE note_status RENAME VALUE 'saved' TO 'completed';
ALTER TYPE resource_status RENAME VALUE 'saved' TO 'completed';
