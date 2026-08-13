PRAGMA foreign_keys = ON;

ALTER TABLE admin_security_config ADD COLUMN email_attachment_mode TEXT NOT NULL DEFAULT 'pdf' CHECK(email_attachment_mode IN ('none','pdf','csv','both'));
ALTER TABLE admin_security_config ADD COLUMN email_new_candidate INTEGER NOT NULL DEFAULT 1;
ALTER TABLE admin_security_config ADD COLUMN email_new_recruiter INTEGER NOT NULL DEFAULT 1;
ALTER TABLE admin_security_config ADD COLUMN email_new_job INTEGER NOT NULL DEFAULT 1;
ALTER TABLE admin_security_config ADD COLUMN email_new_application INTEGER NOT NULL DEFAULT 1;
ALTER TABLE admin_security_config ADD COLUMN email_critical_error INTEGER NOT NULL DEFAULT 1;
ALTER TABLE admin_security_config ADD COLUMN email_suspicious_admin_login INTEGER NOT NULL DEFAULT 1;

CREATE TABLE admin_email_outbox (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK(event_type IN ('new_candidate','new_recruiter','new_job','new_application','critical_error','suspicious_admin_login','test')),
  resource_type TEXT,
  resource_id TEXT,
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_email_outbox_due_idx ON admin_email_outbox(status,next_attempt_at);
CREATE UNIQUE INDEX admin_email_outbox_event_idx ON admin_email_outbox(event_type,resource_type,resource_id) WHERE event_type <> 'test';

CREATE TABLE admin_email_delivery_logs (
  id TEXT PRIMARY KEY,
  outbox_id TEXT REFERENCES admin_email_outbox(id) ON DELETE SET NULL,
  recipient TEXT,
  event_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  attachment_names_json TEXT NOT NULL DEFAULT '[]',
  body_snapshot_json TEXT NOT NULL DEFAULT '{}',
  success INTEGER NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_email_delivery_logs_created_idx ON admin_email_delivery_logs(created_at DESC);
