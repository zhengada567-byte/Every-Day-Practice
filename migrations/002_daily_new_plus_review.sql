-- Daily plan: 5 new words + up to 3 review words (learned earlier)

ALTER TABLE child_word_state
  ADD COLUMN IF NOT EXISTS learned_at TIMESTAMPTZ;

COMMENT ON COLUMN child_word_state.learned_at IS
  'Set when child finishes a daily plan with this word as word_role=new (Learn+L1+L2+L3).';

ALTER TABLE daily_plans
  ADD COLUMN IF NOT EXISTS new_word_count SMALLINT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS review_word_count SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE daily_plan_words
  ADD COLUMN IF NOT EXISTS word_role TEXT NOT NULL DEFAULT 'new';

ALTER TABLE daily_plan_words
  DROP CONSTRAINT IF EXISTS daily_plan_words_slot_check;

ALTER TABLE daily_plan_words
  ADD CONSTRAINT daily_plan_words_word_role_check
  CHECK (word_role IN ('new', 'review'));

ALTER TABLE daily_plan_words
  ADD CONSTRAINT daily_plan_words_slot_check
  CHECK (slot BETWEEN 1 AND 8);

-- Backfill existing rows (if any) as new words
UPDATE daily_plan_words SET word_role = 'new' WHERE word_role IS NULL;
