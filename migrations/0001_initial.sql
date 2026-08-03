PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter', 'admin')),
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE candidate_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  region TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'fr',
  professional_title TEXT,
  introduction TEXT CHECK(length(introduction) <= 1000),
  availability TEXT,
  questionnaire_answers TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE recruiter_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT,
  job_title TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('cv', 'cover_letter')),
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
CREATE UNIQUE INDEX one_default_document ON documents(user_id, kind) WHERE is_default = 1 AND deleted_at IS NULL;
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK(purpose IN ('verify_email', 'reset_password')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE questionnaire_questions (
  id TEXT PRIMARY KEY,
  field_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  labels_json TEXT NOT NULL,
  description_json TEXT,
  options_json TEXT,
  sort_order INTEGER NOT NULL,
  is_required INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
INSERT INTO questionnaire_questions (id, field_key, type, labels_json, options_json, sort_order, is_required) VALUES
  ('q-experience', 'years_experience', 'select', '{"fr":"Années d’expérience","en":"Years of experience","ar":"سنوات الخبرة","tzm":"ⵜⵉⵎⵉⵔⵉⵏ ⵏ ⵜⵎⵙⵙⵉⵔⵜ"}', '["0-1","2-4","5-7","8+"]', 10, 1),
  ('q-availability', 'availability', 'select', '{"fr":"Disponibilité","en":"Availability","ar":"التوفر","tzm":"ⵜⴰⵡⴰⴼⵉⵜ"}', '["Immédiate","Sous 1 mois","Sous 3 mois"]', 20, 1),
  ('q-work-mode', 'work_mode', 'multiselect', '{"fr":"Préférence de travail","en":"Work preference","ar":"تفضيل العمل","tzm":"ⵉⵙⵎⵉⵔⵏ ⵏ ⵓⵎⴰⵀⵉⵍ"}', '["Présentiel","Hybride","À distance"]', 30, 0);
