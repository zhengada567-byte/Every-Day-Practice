-- Everyday Word Practice — full schema for Supabase (fresh database)
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS columns where possible.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Users & families
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS parent_children (
  parent_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children (parent_id);

-- ---------------------------------------------------------------------------
-- Word content
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS words (
  id SERIAL PRIMARY KEY,
  lemma TEXT NOT NULL UNIQUE,
  explanation TEXT NOT NULL,
  picture_emoji TEXT NOT NULL DEFAULT '📖',
  picture_search TEXT,
  picture_style TEXT CHECK (
    picture_style IS NULL
    OR picture_style IN ('cartoon', 'diagram', 'photo')
  ),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS word_examples (
  id SERIAL PRIMARY KEY,
  word_id INT NOT NULL REFERENCES words (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_word_examples_word ON word_examples (word_id);

CREATE TABLE IF NOT EXISTS blank_items (
  id SERIAL PRIMARY KEY,
  word_id INT NOT NULL REFERENCES words (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  answer TEXT NOT NULL,
  distractors JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_blank_items_word ON blank_items (word_id);

-- ---------------------------------------------------------------------------
-- Calendar
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS holidays (
  date DATE PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'HK'
);

-- ---------------------------------------------------------------------------
-- Per-child progress
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS child_word_state (
  child_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  word_id INT NOT NULL REFERENCES words (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'assigned', 'mastered')
  ),
  source TEXT NOT NULL DEFAULT 'new' CHECK (
    source IN ('new', 'retry', 'missed_day')
  ),
  mastered_at TIMESTAMPTZ,
  last_assigned_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_child_word_state_child_status ON child_word_state (child_id, status);

CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'completed', 'missed')
  ),
  phase TEXT NOT NULL DEFAULT 'learn' CHECK (
    phase IN ('learn', 'l1', 'l2', 'l3', 'done')
  ),
  new_word_count SMALLINT NOT NULL DEFAULT 5,
  review_word_count SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (child_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_child_date ON daily_plans (child_id, plan_date);

CREATE TABLE IF NOT EXISTS daily_plan_words (
  daily_plan_id UUID NOT NULL REFERENCES daily_plans (id) ON DELETE CASCADE,
  word_id INT NOT NULL REFERENCES words (id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 8),
  word_role TEXT NOT NULL DEFAULT 'new' CHECK (word_role IN ('new', 'review')),
  PRIMARY KEY (daily_plan_id, word_id),
  UNIQUE (daily_plan_id, slot)
);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id BIGSERIAL PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  daily_plan_id UUID REFERENCES daily_plans (id) ON DELETE SET NULL,
  word_id INT NOT NULL REFERENCES words (id) ON DELETE CASCADE,
  activity TEXT NOT NULL CHECK (
    activity IN (
      'learn',
      'match_meaning',
      'match_picture',
      'blank',
      'sentence'
    )
  ),
  correct BOOLEAN NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_child ON practice_attempts (child_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  period_key TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN (
      'scheduled',
      'in_progress',
      'pending_makeup',
      'completed',
      'expired'
    )
  ),
  word_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (child_id, type, period_key)
);

CREATE INDEX IF NOT EXISTS idx_assessments_child_status ON assessments (child_id, status);

CREATE TABLE IF NOT EXISTS assessment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments (id) ON DELETE CASCADE,
  word_id INT NOT NULL REFERENCES words (id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (
    item_type IN ('match_meaning', 'match_picture', 'blank', 'sentence')
  ),
  sort_order INT NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}',
  answer_key JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_assessment_items_assessment ON assessment_items (assessment_id);

CREATE TABLE IF NOT EXISTS assessment_responses (
  id BIGSERIAL PRIMARY KEY,
  assessment_item_id UUID NOT NULL REFERENCES assessment_items (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  response JSONB NOT NULL DEFAULT '{}',
  correct BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_item_id, child_id)
);

CREATE TABLE IF NOT EXISTS assessment_word_results (
  assessment_id UUID NOT NULL REFERENCES assessments (id) ON DELETE CASCADE,
  word_id INT NOT NULL REFERENCES words (id) ON DELETE CASCADE,
  all_correct BOOLEAN NOT NULL,
  items_total SMALLINT NOT NULL,
  items_correct SMALLINT NOT NULL,
  PRIMARY KEY (assessment_id, word_id)
);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments (id) ON DELETE SET NULL,
  daily_plan_id UUID REFERENCES daily_plans (id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  period_key TEXT,
  summary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_child ON reports (child_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Pet & coins
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS child_coin_balances (
  child_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  coins INT NOT NULL DEFAULT 0 CHECK (coins >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS child_pet (
  child_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  food_progress INT NOT NULL DEFAULT 0 CHECK (food_progress >= 0 AND food_progress <= 10),
  full_until TIMESTAMPTZ,
  happy_until TIMESTAMPTZ,
  outfit TEXT,
  background TEXT NOT NULL DEFAULT 'grass',
  owned_backgrounds JSONB NOT NULL DEFAULT '["grass"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_plan_coin_grants (
  daily_plan_id UUID NOT NULL REFERENCES daily_plans (id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('l1', 'l2', 'l3')),
  word_count INT NOT NULL,
  coins_granted INT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (daily_plan_id, phase)
);

-- Upgrades for databases created from older partial scripts
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE child_pet ADD COLUMN IF NOT EXISTS background TEXT NOT NULL DEFAULT 'grass';
ALTER TABLE child_pet ADD COLUMN IF NOT EXISTS owned_backgrounds JSONB NOT NULL DEFAULT '["grass"]'::jsonb;
ALTER TABLE daily_plans ADD COLUMN IF NOT EXISTS new_word_count SMALLINT NOT NULL DEFAULT 5;
ALTER TABLE daily_plans ADD COLUMN IF NOT EXISTS review_word_count SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE daily_plan_words ADD COLUMN IF NOT EXISTS word_role TEXT NOT NULL DEFAULT 'new';

INSERT INTO schema_migrations (version) VALUES
  ('001_initial.sql'),
  ('002_daily_new_plus_review.sql'),
  ('003_review_from_mastered.sql'),
  ('004_pet_coins.sql'),
  ('005_test_accounts.sql'),
  ('006_pet_backgrounds.sql')
ON CONFLICT (version) DO NOTHING;

-- Quick check (optional — comment out if you prefer)
-- SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = 'public';
