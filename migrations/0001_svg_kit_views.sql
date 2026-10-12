CREATE TABLE IF NOT EXISTS svg_kit_views (
  theme_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0)
);
