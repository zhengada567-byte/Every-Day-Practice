-- Pet scene backgrounds (purchased with golden coins)

ALTER TABLE child_pet ADD COLUMN IF NOT EXISTS background TEXT NOT NULL DEFAULT 'grass';
ALTER TABLE child_pet ADD COLUMN IF NOT EXISTS owned_backgrounds JSONB NOT NULL DEFAULT '["grass"]'::jsonb;
