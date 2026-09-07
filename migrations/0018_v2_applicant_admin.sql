PRAGMA foreign_keys = ON;

ALTER TABLE v2_applicants ADD COLUMN admin_notes TEXT;
ALTER TABLE v2_applicants ADD COLUMN reviewed_at TEXT;

CREATE TABLE v2_applicant_history (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES v2_applicants(id) ON DELETE CASCADE,
  admin_session_id TEXT,
  previous_status TEXT,
  next_status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX v2_applicant_history_idx ON v2_applicant_history(applicant_id, created_at DESC);
