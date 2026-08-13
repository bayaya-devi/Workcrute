PRAGMA foreign_keys = ON;

CREATE TABLE platform_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('candidates','recruiters','jobs','applications','companies','interviews','security','errors','system')),
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX platform_events_created_idx ON platform_events(created_at DESC, id DESC);
CREATE INDEX platform_events_category_idx ON platform_events(category, id DESC);
