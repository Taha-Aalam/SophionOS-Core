ALTER TABLE topics ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_topics_user_archived ON topics(user_id) WHERE is_archived = true;