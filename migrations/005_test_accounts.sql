-- QA / admin test accounts (bypass UI + relaxed scheduling in test harness)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE;
