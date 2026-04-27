-- Step 17: Resources table + minimal topics table (Step 18 will expand)
-- Topics created here to satisfy FK constraint for resources.topic_id

CREATE TYPE resource_status AS ENUM ('inbox', 'to_review', 'active');
CREATE TYPE resource_type AS ENUM ('website', 'article', 'video', 'document', 'podcast', 'social_media', 'tool');

-- Minimal topics table (expanded in Step 18)
CREATE TABLE topics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID REFERENCES areas(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  favorite    BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_select_own" ON topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "topics_insert_own" ON topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "topics_update_own" ON topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "topics_delete_own" ON topics FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_topics_updated
  BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_topics_user ON topics(user_id);
CREATE INDEX idx_topics_area ON topics(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX idx_topics_user_favorite ON topics(user_id) WHERE favorite = true;

-- Resources table
CREATE TABLE resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID REFERENCES areas(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  topic_id    UUID REFERENCES topics(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  url         TEXT,
  type        resource_type NOT NULL DEFAULT 'website',
  status      resource_status NOT NULL DEFAULT 'inbox',
  favorite    BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources_select_own" ON resources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "resources_insert_own" ON resources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "resources_update_own" ON resources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "resources_delete_own" ON resources FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_resources_updated
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_resources_user ON resources(user_id) WHERE NOT is_archived;
CREATE INDEX idx_resources_user_status ON resources(user_id, status) WHERE NOT is_archived;
CREATE INDEX idx_resources_area ON resources(area_id) WHERE NOT is_archived AND area_id IS NOT NULL;
CREATE INDEX idx_resources_project ON resources(project_id) WHERE NOT is_archived AND project_id IS NOT NULL;
CREATE INDEX idx_resources_topic ON resources(topic_id) WHERE NOT is_archived AND topic_id IS NOT NULL;
CREATE INDEX idx_resources_favorite ON resources(user_id) WHERE favorite = true AND NOT is_archived;
CREATE INDEX idx_resources_search ON resources USING gin(
  to_tsvector('english', name || ' ' || COALESCE(url, ''))
);