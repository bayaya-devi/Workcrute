PRAGMA foreign_keys = ON;

CREATE TABLE faq_entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  question_fr TEXT NOT NULL,
  answer_fr TEXT NOT NULL,
  question_en TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  question_ar TEXT NOT NULL,
  answer_ar TEXT NOT NULL,
  keywords_fr TEXT NOT NULL DEFAULT '[]',
  keywords_en TEXT NOT NULL DEFAULT '[]',
  keywords_ar TEXT NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 50,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX faq_entries_category_idx ON faq_entries(category,is_active,priority DESC);

CREATE TABLE chatbot_queries (
  id TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('fr','en','ar')),
  matched INTEGER NOT NULL DEFAULT 0,
  faq_id TEXT REFERENCES faq_entries(id) ON DELETE SET NULL,
  category TEXT,
  score REAL NOT NULL DEFAULT 0,
  converted_faq_id TEXT REFERENCES faq_entries(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX chatbot_queries_created_idx ON chatbot_queries(created_at DESC);
CREATE INDEX chatbot_queries_match_idx ON chatbot_queries(matched,created_at DESC);
