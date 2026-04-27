-- Step 18: Topics full CRUD
-- 1. Junction table for many-to-many topic ↔ area linking
-- 2. Add inactive column to topics
-- 3. Add topic_id to notes
-- 4. recalc_topic_inactive() trigger function

-- Junction table: topic can belong to multiple areas
CREATE TABLE topic_areas (
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  area_id   UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, area_id)
);

CREATE INDEX idx_topic_areas_topic ON topic_areas(topic_id);
CREATE INDEX idx_topic_areas_area  ON topic_areas(area_id);

-- Add inactive column to topics
ALTER TABLE topics ADD COLUMN IF NOT EXISTS inactive BOOLEAN NOT NULL DEFAULT true;

-- Add topic_id to notes (notes can link to topics)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;

CREATE INDEX idx_notes_topic ON notes(topic_id) WHERE topic_id IS NOT NULL AND NOT is_archived;

-- Function to recalculate topic inactive status
-- A topic is inactive when it has 0 linked notes + 0 linked resources
CREATE OR REPLACE FUNCTION update_topic_inactive_status(target_topic_id UUID)
RETURNS VOID AS $$
DECLARE
  activity_count INTEGER;
BEGIN
  SELECT (
    (SELECT count(*) FROM notes WHERE topic_id = target_topic_id AND is_archived = false) +
    (SELECT count(*) FROM resources WHERE topic_id = target_topic_id AND is_archived = false)
  ) INTO activity_count;

  UPDATE topics
  SET inactive = (activity_count = 0)
  WHERE id = target_topic_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers for Notes (on topic_id change)
CREATE OR REPLACE FUNCTION trigger_topic_activity_notes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM update_topic_inactive_status(NEW.topic_id);
    IF (TG_OP = 'UPDATE' AND OLD.topic_id IS DISTINCT FROM NEW.topic_id) THEN
      PERFORM update_topic_inactive_status(OLD.topic_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM update_topic_inactive_status(OLD.topic_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topic_activity_notes_trigger ON notes;
CREATE TRIGGER topic_activity_notes_trigger
AFTER INSERT OR UPDATE OR DELETE ON notes
FOR EACH ROW EXECUTE FUNCTION trigger_topic_activity_notes();

-- Triggers for Resources (on topic_id change)
CREATE OR REPLACE FUNCTION trigger_topic_activity_resources()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM update_topic_inactive_status(NEW.topic_id);
    IF (TG_OP = 'UPDATE' AND OLD.topic_id IS DISTINCT FROM NEW.topic_id) THEN
      PERFORM update_topic_inactive_status(OLD.topic_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM update_topic_inactive_status(OLD.topic_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topic_activity_resources_trigger ON resources;
CREATE TRIGGER topic_activity_resources_trigger
AFTER INSERT OR UPDATE OR DELETE ON resources
FOR EACH ROW EXECUTE FUNCTION trigger_topic_activity_resources();