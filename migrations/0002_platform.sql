PRAGMA foreign_keys = ON;

ALTER TABLE recruiter_profiles ADD COLUMN company_sector TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN company_size TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN city TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN website TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN questionnaire_answers TEXT NOT NULL DEFAULT '{}';

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sector TEXT,
  company_size TEXT,
  city TEXT,
  website TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX companies_owner_idx ON companies(owner_user_id);

CREATE TABLE job_offers (
  id TEXT PRIMARY KEY,
  recruiter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT NOT NULL,
  missions TEXT,
  required_skills TEXT NOT NULL DEFAULT '[]',
  contract_type TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Maroc',
  work_mode TEXT NOT NULL,
  experience_level TEXT,
  education_level TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  deadline_at TEXT,
  openings_count INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','closed','archived','suspended')),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX job_offers_public_idx ON job_offers(status, published_at DESC);
CREATE INDEX job_offers_recruiter_idx ON job_offers(recruiter_user_id, status);
CREATE INDEX job_offers_search_idx ON job_offers(domain, city, contract_type, work_mode);

CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  job_offer_id TEXT NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  candidate_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewing','shortlisted','interview','rejected','accepted','withdrawn')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_offer_id, candidate_user_id)
);
CREATE INDEX applications_candidate_idx ON applications(candidate_user_id, created_at DESC);
CREATE INDEX applications_offer_idx ON applications(job_offer_id, status);

CREATE TABLE application_status_history (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);
