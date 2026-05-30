-- Review words come from mastered list (quiz), not a separate learned_at flag.

ALTER TABLE child_word_state
  DROP COLUMN IF EXISTS learned_at;

COMMENT ON COLUMN child_word_state.mastered_at IS
  'Set when word passes weekly/monthly quiz (all items correct). Mastered words are eligible for daily review slots.';
