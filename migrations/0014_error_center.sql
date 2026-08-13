PRAGMA foreign_keys = ON;

CREATE TABLE app_errors (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL CHECK(severity IN ('info','warning','error','critical')),
  service TEXT NOT NULL CHECK(service IN ('api','auth','database','email','upload','ai','frontend')),
  code TEXT NOT NULL,
  user_message TEXT NOT NULL,
  technical_message TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  route TEXT,
  method TEXT,
  http_status INTEGER,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_progress','resolved','ignored')),
  admin_note TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);
CREATE INDEX app_errors_occurred_idx ON app_errors(occurred_at DESC);
CREATE INDEX app_errors_status_idx ON app_errors(status,severity,occurred_at DESC);
CREATE INDEX app_errors_service_idx ON app_errors(service,occurred_at DESC);
