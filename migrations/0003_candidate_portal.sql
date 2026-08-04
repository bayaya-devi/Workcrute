PRAGMA foreign_keys = ON;

ALTER TABLE candidate_profiles ADD COLUMN country TEXT;
ALTER TABLE candidate_profiles ADD COLUMN profile_visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE candidate_profiles ADD COLUMN skills_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE candidate_profiles ADD COLUMN preferences_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE profile_views (
  id TEXT PRIMARY KEY,
  profile_owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  viewer_role TEXT,
  source TEXT,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX profile_views_owner_idx ON profile_views(profile_owner_id, viewed_at DESC);
CREATE INDEX profile_views_unique_viewer_idx ON profile_views(profile_owner_id, viewer_user_id);

CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  in_app_enabled INTEGER NOT NULL DEFAULT 1,
  email_enabled INTEGER NOT NULL DEFAULT 1,
  job_alerts_enabled INTEGER NOT NULL DEFAULT 1,
  profile_view_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keywords TEXT,
  domain TEXT,
  city TEXT,
  contract_type TEXT,
  work_mode TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK(frequency IN ('immediate','daily','weekly')),
  in_app_enabled INTEGER NOT NULL DEFAULT 1,
  email_enabled INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX job_alerts_user_idx ON job_alerts(user_id, is_active);

CREATE TABLE job_alert_matches (
  alert_id TEXT NOT NULL REFERENCES job_alerts(id) ON DELETE CASCADE,
  job_offer_id TEXT NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  notified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(alert_id, job_offer_id)
);
