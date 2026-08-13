PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'
  CHECK(account_status IN ('active','suspended'));
ALTER TABLE companies ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK(status IN ('active','suspended'));

CREATE INDEX users_role_status_idx ON users(role, account_status, created_at DESC);
CREATE INDEX companies_status_idx ON companies(status, created_at DESC);
