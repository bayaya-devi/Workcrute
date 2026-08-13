PRAGMA foreign_keys = ON;

CREATE TABLE admin_questionnaire_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_kind TEXT NOT NULL DEFAULT 'custom' CHECK(template_kind IN ('general','sales','it','logistics','management','custom')),
  creator_label TEXT NOT NULL DEFAULT 'Administrateur',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
  is_recruiter_available INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_templates_status_idx ON admin_questionnaire_templates(status, updated_at DESC);

CREATE TABLE admin_template_questions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES admin_questionnaire_templates(id) ON DELETE CASCADE,
  label_json TEXT NOT NULL,
  description_json TEXT NOT NULL DEFAULT '{}',
  help_json TEXT NOT NULL DEFAULT '{}',
  placeholder_json TEXT NOT NULL DEFAULT '{}',
  question_type TEXT NOT NULL CHECK(question_type IN ('short_text','long_text','number','boolean','single_choice','multiple_choice','date','rating','upload')),
  options_json TEXT NOT NULL DEFAULT '[]',
  is_required INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 0 CHECK(weight BETWEEN 0 AND 100),
  is_eliminatory INTEGER NOT NULL DEFAULT 0,
  validation_json TEXT NOT NULL DEFAULT '{}',
  condition_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_template_questions_order_idx ON admin_template_questions(template_id, sort_order, created_at);

ALTER TABLE recruiter_questionnaires ADD COLUMN source_template_id TEXT REFERENCES admin_questionnaire_templates(id) ON DELETE SET NULL;
ALTER TABLE recruiter_questions ADD COLUMN description_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE recruiter_questions ADD COLUMN placeholder_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE recruiter_questions ADD COLUMN validation_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE applications ADD COLUMN questionnaire_evaluation_json TEXT NOT NULL DEFAULT '{}';

INSERT INTO admin_questionnaire_templates(id,name,description,template_kind,creator_label,status,is_recruiter_available) VALUES
  ('template-general','Général','Questions générales adaptables à la plupart des recrutements.','general','Workcrute','active',1),
  ('template-sales','Commercial','Base pour les fonctions commerciales et relation client.','sales','Workcrute','active',1),
  ('template-it','Informatique','Base pour les métiers techniques et numériques.','it','Workcrute','active',1),
  ('template-logistics','Logistique','Base pour les métiers de la chaîne logistique.','logistics','Workcrute','active',1),
  ('template-management','Management','Base pour les postes d’encadrement et de direction.','management','Workcrute','active',1),
  ('template-custom','Personnalisé','Point de départ vide pour un questionnaire sur mesure.','custom','Workcrute','active',1);
