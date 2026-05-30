-- Golden coins + 宠物小精灵 pet care

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
