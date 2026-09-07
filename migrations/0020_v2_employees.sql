PRAGMA foreign_keys = ON;

CREATE TABLE v2_employee_profiles (
  account_id TEXT PRIMARY KEY REFERENCES v2_accounts(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  job_title TEXT NOT NULL,
  department TEXT,
  hire_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX v2_employee_email_idx ON v2_employee_profiles(lower(email)) WHERE email IS NOT NULL AND email<>'';
