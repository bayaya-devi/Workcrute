PRAGMA foreign_keys = ON;

CREATE TABLE candidate_referrals (
  id TEXT PRIMARY KEY,
  candidate_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recruiter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  job_offer_id TEXT REFERENCES job_offers(id) ON DELETE SET NULL,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  sent_by_admin_session_id TEXT,
  admin_message TEXT,
  status TEXT NOT NULL DEFAULT 'transmitted' CHECK(status IN ('transmitted','viewed','shortlisted','interview','accepted','rejected')),
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  viewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX candidate_referrals_recruiter_idx ON candidate_referrals(recruiter_user_id,status,sent_at DESC);
CREATE INDEX candidate_referrals_candidate_idx ON candidate_referrals(candidate_user_id,sent_at DESC);
CREATE INDEX candidate_referrals_job_idx ON candidate_referrals(job_offer_id,sent_at DESC);
CREATE UNIQUE INDEX candidate_referrals_legacy_application_idx ON candidate_referrals(application_id) WHERE application_id IS NOT NULL;

CREATE TABLE candidate_referral_documents (
  referral_id TEXT NOT NULL REFERENCES candidate_referrals(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  PRIMARY KEY(referral_id,document_id)
);
CREATE TABLE candidate_referral_history (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES candidate_referrals(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('transmitted','viewed','shortlisted','interview','accepted','rejected')),
  actor_type TEXT NOT NULL CHECK(actor_type IN ('admin','recruiter','system')),
  actor_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX candidate_referral_history_idx ON candidate_referral_history(referral_id,created_at);
CREATE TABLE candidate_referral_notes (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES candidate_referrals(id) ON DELETE CASCADE,
  author_recruiter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE candidate_referral_interviews (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES candidate_referrals(id) ON DELETE CASCADE,
  candidate_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recruiter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  interview_type TEXT NOT NULL CHECK(interview_type IN ('onsite','phone','video')),
  location TEXT,
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','confirmed','cancelled','completed','declined')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX referral_interviews_recruiter_idx ON candidate_referral_interviews(recruiter_user_id,starts_at);

CREATE TABLE recruiter_referral_email_outbox (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES candidate_referrals(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 4,
  next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX recruiter_referral_email_due_idx ON recruiter_referral_email_outbox(status,next_attempt_at);

INSERT OR IGNORE INTO candidate_referrals(id,candidate_user_id,recruiter_user_id,company_id,job_offer_id,application_id,status,sent_at)
SELECT 'legacy-referral-' || a.id,a.candidate_user_id,j.recruiter_user_id,j.company_id,j.id,a.id,
 CASE a.status WHEN 'shortlisted' THEN 'shortlisted' WHEN 'interview' THEN 'interview' WHEN 'accepted' THEN 'accepted' WHEN 'rejected' THEN 'rejected' ELSE 'transmitted' END,a.created_at
FROM applications a JOIN job_offers j ON j.id=a.job_offer_id;
INSERT OR IGNORE INTO candidate_referral_documents(referral_id,document_id)
SELECT r.id,d.id FROM candidate_referrals r JOIN documents d ON d.user_id=r.candidate_user_id
WHERE d.deleted_at IS NULL AND d.kind='cv' AND d.is_default=1;
INSERT OR IGNORE INTO candidate_referral_history(id,referral_id,status,actor_type,created_at)
SELECT 'legacy-history-' || r.id,r.id,r.status,'system',r.sent_at FROM candidate_referrals r;

CREATE TABLE platform_settings_v2 (
  section TEXT PRIMARY KEY CHECK(section IN ('general','registrations','documents','jobs','applications','interviews','matching','chatbot','maintenance','recruiter_access')),
  value_json TEXT NOT NULL CHECK(json_valid(value_json)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO platform_settings_v2 SELECT * FROM platform_settings;
DROP TABLE platform_settings;
ALTER TABLE platform_settings_v2 RENAME TO platform_settings;
INSERT INTO platform_settings(section,value_json) VALUES('recruiter_access','{"globalCandidateDatabaseEnabled":false}');
