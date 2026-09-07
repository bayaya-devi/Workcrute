PRAGMA foreign_keys = ON;

CREATE TABLE v2_holidays (
  holiday_date TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE v2_leave_requests (
  id TEXT PRIMARY KEY,
  employee_account_id TEXT NOT NULL REFERENCES v2_accounts(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  working_days INTEGER NOT NULL CHECK(working_days > 0),
  employee_comment TEXT,
  admin_comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','refused','cancelled')),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(start_date <= end_date)
);
CREATE INDEX v2_leave_employee_idx ON v2_leave_requests(employee_account_id, start_date DESC);
CREATE INDEX v2_leave_status_idx ON v2_leave_requests(status, created_at DESC);
