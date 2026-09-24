PRAGMA foreign_keys = ON;

CREATE TABLE v2_employee_notification_preferences (
  account_id TEXT PRIMARY KEY REFERENCES v2_accounts(id) ON DELETE CASCADE,
  email_enabled INTEGER NOT NULL DEFAULT 1 CHECK(email_enabled IN (0,1)),
  leave_email_enabled INTEGER NOT NULL DEFAULT 1 CHECK(leave_email_enabled IN (0,1)),
  invoice_email_enabled INTEGER NOT NULL DEFAULT 1 CHECK(invoice_email_enabled IN (0,1)),
  reminder_email_enabled INTEGER NOT NULL DEFAULT 1 CHECK(reminder_email_enabled IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE v2_employee_email_outbox (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES v2_accounts(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK(event IN ('leave_approved','leave_refused')),
  recipient TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr' CHECK(language IN ('fr','en','ar')),
  resource_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event, resource_id)
);
CREATE INDEX v2_employee_email_due_idx ON v2_employee_email_outbox(status,next_attempt_at);
