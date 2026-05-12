-- Run this in your Neon SQL editor to create the user_data table

CREATE TABLE IF NOT EXISTS user_data (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL UNIQUE,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data (user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_updated ON user_data (updated_at DESC);
