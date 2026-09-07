PRAGMA foreign_keys = ON;

CREATE TABLE v2_accounts (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('admin','employee')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  first_name_normalized TEXT NOT NULL,
  last_name_normalized TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active','disabled')),
  preferred_language TEXT NOT NULL DEFAULT 'fr' CHECK(preferred_language IN ('fr','en','ar')),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX v2_accounts_identity_idx ON v2_accounts(first_name_normalized,last_name_normalized);
CREATE UNIQUE INDEX v2_single_admin_idx ON v2_accounts(role) WHERE role='admin';

CREATE TABLE v2_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES v2_accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX v2_sessions_account_idx ON v2_sessions(account_id, expires_at);

CREATE TABLE v2_login_attempts (
  fingerprint TEXT NOT NULL,
  identity_hash TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX v2_login_attempts_limit_idx ON v2_login_attempts(fingerprint,identity_hash,attempted_at);
