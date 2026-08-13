PRAGMA foreign_keys = OFF;

ALTER TABLE candidate_profiles ADD COLUMN availability_details TEXT;
ALTER TABLE candidate_profiles ADD COLUMN experience_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE candidate_profiles ADD COLUMN education_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE candidate_profiles ADD COLUMN languages_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE job_alerts ADD COLUMN name TEXT;
ALTER TABLE job_alerts ADD COLUMN skills_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE documents_next (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('cv','cover_letter','diploma','certificate','portfolio','other')),
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
INSERT INTO documents_next SELECT * FROM documents;
DROP TABLE documents;
ALTER TABLE documents_next RENAME TO documents;
CREATE UNIQUE INDEX one_default_document ON documents(user_id, kind) WHERE is_default = 1 AND deleted_at IS NULL;

CREATE TABLE saved_jobs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_offer_id TEXT NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, job_offer_id)
);
CREATE INDEX saved_jobs_user_idx ON saved_jobs(user_id, created_at DESC);

CREATE TABLE interviews (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recruiter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  interview_type TEXT NOT NULL CHECK(interview_type IN ('onsite','video','phone')),
  location TEXT,
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','confirmed','declined','reschedule_requested','cancelled','completed')),
  candidate_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX interviews_candidate_idx ON interviews(candidate_user_id, starts_at);

PRAGMA foreign_keys = ON;
