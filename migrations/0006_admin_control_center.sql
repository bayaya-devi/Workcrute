PRAGMA foreign_keys = ON;

CREATE TABLE admin_security_config (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  secret_1_hash TEXT,
  secret_1_salt TEXT,
  secret_2_hash TEXT,
  secret_2_salt TEXT,
  primary_email TEXT COLLATE NOCASE,
  primary_email_verified_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO admin_security_config(id) VALUES(1);

CREATE TABLE admin_auth_challenges (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  ip_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_challenge_expiry_idx ON admin_auth_challenges(expires_at);

CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  ip_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  idle_expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_session_expiry_idx ON admin_sessions(expires_at, idle_expires_at);

CREATE TABLE admin_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  failure_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  blocked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_login_attempts (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  step INTEGER NOT NULL CHECK(step IN (1,2)),
  success INTEGER NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_login_attempt_idx ON admin_login_attempts(created_at DESC);

CREATE TABLE admin_secret_changes (
  id TEXT PRIMARY KEY,
  admin_session_id TEXT NOT NULL REFERENCES admin_sessions(id) ON DELETE CASCADE,
  secret_level INTEGER NOT NULL CHECK(secret_level IN (1,2)),
  new_secret_hash TEXT NOT NULL,
  new_secret_salt TEXT NOT NULL,
  verification_code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_email_changes (
  id TEXT PRIMARY KEY,
  admin_session_id TEXT NOT NULL REFERENCES admin_sessions(id) ON DELETE CASCADE,
  new_email TEXT NOT NULL COLLATE NOCASE,
  verification_code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_notifications (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info','warning','critical','success')),
  href TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_notification_created_idx ON admin_notifications(created_at DESC);

CREATE TABLE admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_session_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  before_json TEXT,
  after_json TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_audit_created_idx ON admin_audit_logs(created_at DESC);
