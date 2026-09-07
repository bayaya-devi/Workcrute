PRAGMA foreign_keys = ON;

CREATE TABLE v2_applicants (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  professional_title TEXT NOT NULL,
  domain TEXT NOT NULL,
  domain_other TEXT,
  experience_level TEXT NOT NULL,
  availability TEXT NOT NULL,
  motivation TEXT,
  answers_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(answers_json)),
  preferred_language TEXT NOT NULL DEFAULT 'fr' CHECK(preferred_language IN ('fr','en','ar')),
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewing','shortlisted','interview','accepted','refused','archived')),
  consent_at TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX v2_applicants_status_idx ON v2_applicants(status, created_at DESC);
CREATE INDEX v2_applicants_email_idx ON v2_applicants(email, created_at DESC);

CREATE TABLE v2_applicant_documents (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES v2_applicants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('cv','cover_letter')),
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 8388608),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX v2_applicant_document_kind_idx ON v2_applicant_documents(applicant_id, kind);

CREATE TABLE v2_applicant_document_chunks (
  document_id TEXT NOT NULL REFERENCES v2_applicant_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY(document_id, chunk_index)
);

CREATE TABLE v2_submission_attempts (
  fingerprint TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX v2_submission_attempts_idx ON v2_submission_attempts(fingerprint, attempted_at);

CREATE TABLE v2_applicant_email_outbox (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES v2_applicants(id) ON DELETE CASCADE,
  audience TEXT NOT NULL CHECK(audience IN ('applicant','admin')),
  recipient TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr' CHECK(language IN ('fr','en','ar')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX v2_applicant_email_once_idx ON v2_applicant_email_outbox(applicant_id, audience);
CREATE INDEX v2_applicant_email_due_idx ON v2_applicant_email_outbox(status, next_attempt_at);
