PRAGMA foreign_keys = ON;

ALTER TABLE companies ADD COLUMN description TEXT;
ALTER TABLE companies ADD COLUMN logo_url TEXT;
ALTER TABLE job_offers ADD COLUMN responsibilities TEXT;
ALTER TABLE job_offers ADD COLUMN benefits TEXT;
ALTER TABLE job_offers ADD COLUMN conditions_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE job_offers ADD COLUMN questionnaire_id TEXT;
ALTER TABLE applications ADD COLUMN questionnaire_answers_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE recruiter_questionnaires (
  id TEXT PRIMARY KEY,
  recruiter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX recruiter_questionnaires_owner_idx ON recruiter_questionnaires(recruiter_user_id, updated_at DESC);

CREATE TABLE recruiter_questions (
  id TEXT PRIMARY KEY,
  questionnaire_id TEXT NOT NULL REFERENCES recruiter_questionnaires(id) ON DELETE CASCADE,
  label_json TEXT NOT NULL,
  help_json TEXT NOT NULL DEFAULT '{}',
  question_type TEXT NOT NULL CHECK(question_type IN ('short_text','long_text','number','boolean','single_choice','multiple_choice','date','rating','upload')),
  options_json TEXT NOT NULL DEFAULT '[]',
  is_required INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 0 CHECK(weight BETWEEN 0 AND 100),
  is_eliminatory INTEGER NOT NULL DEFAULT 0,
  condition_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX recruiter_questions_questionnaire_idx ON recruiter_questions(questionnaire_id, sort_order);

CREATE TABLE application_internal_notes (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX application_notes_idx ON application_internal_notes(application_id, created_at DESC);

CREATE TABLE recruiter_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_language TEXT NOT NULL DEFAULT 'fr',
  email_enabled INTEGER NOT NULL DEFAULT 1,
  application_alerts INTEGER NOT NULL DEFAULT 1,
  interview_alerts INTEGER NOT NULL DEFAULT 1,
  weekly_report INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
