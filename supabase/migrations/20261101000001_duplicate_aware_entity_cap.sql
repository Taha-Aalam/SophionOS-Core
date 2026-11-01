-- Duplicate-aware entity-cap guard (Wall 1).
--
-- The cap trigger was duplicate-blind: it counts rows via the running
-- user_entity_counts counter and raises ENTITY_LIMIT_REACHED on any INSERT
-- once the count is at 100 — including rows an idempotent upsert would then
-- IGNORE via ON CONFLICT DO NOTHING. Any idempotent write whose rows already
-- exist (the starter-areas seed above; PK-keyed upserts) drew a false
-- ENTITY_LIMIT_REACHED for capped users, because the BEFORE INSERT trigger
-- fires before Postgres resolves the conflict.
--
-- Fix: before raising, check whether a row with the same conflicting unique
-- key already exists for this user; if so, let the statement proceed — the
-- upsert resolves it to DO NOTHING (or DO UPDATE), no row is added, and the
-- AFTER INSERT counter never fires. A genuinely new entity beyond the cap
-- still raises, and counter accounting stays exact: a conflict-skipped row
-- changes no counts.
--
-- Audit of every table trg_enforce_entity_cap guards, keyed to each table's
-- unique constraint (conflict check = that key + the row's PK):
--
--   Table        | Unique constraint                                | Check
--   -------------+--------------------------------------------------+------------------
--   areas        | idx_areas_user_slug (user_id, slug)              | (user_id, slug) + id
--   goals        | idx_goals_slug_user (user_id, slug)              | (user_id, slug) + id
--   projects     | idx_projects_slug_user (user_id, slug)           | (user_id, slug) + id
--   notes        | idx_notes_slug_user (user_id, slug)              | (user_id, slug) + id
--   contacts     | contacts_user_id_slug_idx (user_id, slug)        | (user_id, slug) when
--                |   WHERE slug IS NOT NULL (partial)               |   slug IS NOT NULL + id
--   tasks        | PK (id) only — no user-scoped unique key         | id
--   resources    | PK (id) only — no user-scoped unique key         | id
--   contact_logs | PK (id) only — no user-scoped unique key         | id
--
-- NULL slugs never conflict (unique indexes treat NULLs as distinct), so a
-- NULL NEW.slug correctly skips the slug probe. The PK probe covers idempotent
-- upserts keyed on the row id for tables whose only unique key is the PK; for
-- a plain (non-upsert) duplicate it lets the constraint's own 23505 surface
-- instead of a misleading ENTITY_LIMIT_REACHED.

CREATE OR REPLACE FUNCTION public.enforce_entity_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_count INT;
  v_conflicting BOOLEAN;
  -- Scalar projections of NEW. plpgsql binds every field referenced by the
  -- CASE expression below against NEW at plan time — and tasks / resources /
  -- contact_logs have no slug column — so the branch predicates must read
  -- these scalars, never NEW.slug directly. NULL slug = no slug conflict is
  -- possible (unique indexes treat NULLs as distinct).
  v_user_id TEXT := to_jsonb(NEW) ->> 'user_id';
  v_row_id UUID := (to_jsonb(NEW) ->> 'id')::uuid;
  v_slug TEXT := to_jsonb(NEW) ->> 'slug';
BEGIN
  SELECT tier INTO v_tier
  FROM subscriptions
  WHERE user_id = v_user_id AND status = 'active';

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  IF v_tier = 'free' THEN
    -- Duplicate-awareness: a row that already exists under this user's unique
    -- key would be ignored by the statement's ON CONFLICT clause — it is not
    -- a new entity and must not raise. Keyed per table to its unique
    -- constraint (audit above).
    v_conflicting :=
      CASE TG_TABLE_NAME
        WHEN 'areas' THEN
          EXISTS (SELECT 1 FROM public.areas
                  WHERE user_id = v_user_id AND slug = v_slug)
          OR EXISTS (SELECT 1 FROM public.areas WHERE id = v_row_id)
        WHEN 'goals' THEN
          EXISTS (SELECT 1 FROM public.goals
                  WHERE user_id = v_user_id AND slug = v_slug)
          OR EXISTS (SELECT 1 FROM public.goals WHERE id = v_row_id)
        WHEN 'projects' THEN
          EXISTS (SELECT 1 FROM public.projects
                  WHERE user_id = v_user_id AND slug = v_slug)
          OR EXISTS (SELECT 1 FROM public.projects WHERE id = v_row_id)
        WHEN 'notes' THEN
          EXISTS (SELECT 1 FROM public.notes
                  WHERE user_id = v_user_id AND slug = v_slug)
          OR EXISTS (SELECT 1 FROM public.notes WHERE id = v_row_id)
        WHEN 'contacts' THEN
          (v_slug IS NOT NULL AND EXISTS (
             SELECT 1 FROM public.contacts
             WHERE user_id = v_user_id AND slug = v_slug))
          OR EXISTS (SELECT 1 FROM public.contacts WHERE id = v_row_id)
        WHEN 'tasks' THEN
          EXISTS (SELECT 1 FROM public.tasks WHERE id = v_row_id)
        WHEN 'resources' THEN
          EXISTS (SELECT 1 FROM public.resources WHERE id = v_row_id)
        WHEN 'contact_logs' THEN
          EXISTS (SELECT 1 FROM public.contact_logs WHERE id = v_row_id)
        ELSE FALSE
      END;

    IF v_conflicting THEN
      RETURN NEW;
    END IF;

    SELECT entity_count INTO v_count
    FROM user_entity_counts
    WHERE clerk_user_id = v_user_id;

    IF COALESCE(v_count, 0) >= 100 THEN
      RAISE EXCEPTION 'ENTITY_LIMIT_REACHED'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
