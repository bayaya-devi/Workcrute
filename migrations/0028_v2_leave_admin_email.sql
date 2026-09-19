PRAGMA foreign_keys = OFF;

ALTER TABLE admin_security_config ADD COLUMN email_new_leave INTEGER NOT NULL DEFAULT 1;

CREATE TABLE admin_email_outbox_next (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK(event_type IN ('new_candidate','new_recruiter','new_job','new_application','new_leave','critical_error','suspicious_admin_login','test')),
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
INSERT INTO admin_email_outbox_next SELECT * FROM admin_email_outbox;
DROP TABLE admin_email_outbox;
ALTER TABLE admin_email_outbox_next RENAME TO admin_email_outbox;
CREATE INDEX admin_email_outbox_due_idx ON admin_email_outbox(status,next_attempt_at);
CREATE UNIQUE INDEX admin_email_outbox_event_idx ON admin_email_outbox(event_type,resource_type,resource_id) WHERE event_type <> 'test';

PRAGMA foreign_keys = ON;
