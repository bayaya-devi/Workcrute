CREATE TABLE IF NOT EXISTS platform_settings (
  section TEXT PRIMARY KEY CHECK(section IN ('general','registrations','documents','jobs','applications','interviews','matching','chatbot','maintenance')),
  value_json TEXT NOT NULL CHECK(json_valid(value_json)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO platform_settings(section,value_json) VALUES
('general','{"siteName":"Workcrute","supportEmail":"","supportPhone":""}'),
('registrations','{"candidateEnabled":true,"recruiterEnabled":true,"emailVerificationRequired":true,"cvRequired":false}'),
('documents','{"extensions":["pdf","doc","docx"],"maxSizeMb":8,"maxCount":20,"types":["cv","cover_letter","diploma","certificate","portfolio","other"]}'),
('jobs','{"sectors":["Informatique","Commerce","Logistique","Industrie","Services","Santé","Finance","BTP","Tourisme","Éducation"],"contractTypes":["CDI","CDD","Stage","Alternance","Freelance"],"publicationDays":30,"requiredFields":["title","domain","description","contractType","city","workMode"]}'),
('applications','{"statuses":["submitted","reviewing","shortlisted","interview","accepted","rejected","withdrawn"],"withdrawalEnabled":true,"rules":{"coverLetterRequired":false,"completeProfileRequired":false,"cvRequired":false}}'),
('interviews','{"types":["onsite","phone","video"],"defaultDurations":{"onsite":60,"phone":30,"video":45}}'),
('matching','{"enabled":true,"weights":{"skills":25,"experience":15,"education":10,"location":10,"contract":10,"availability":10,"questionnaire":20},"recommendedThreshold":70}'),
('chatbot','{"enabled":true,"welcome":{"fr":"Bonjour, comment puis-je vous aider ?","en":"Hello, how can I help you?","ar":"مرحباً، كيف يمكنني مساعدتك؟"},"similarityThreshold":0.43,"supportContact":""}'),
('maintenance','{"enabled":false,"message":{"fr":"Workcrute est temporairement en maintenance.","en":"Workcrute is temporarily under maintenance.","ar":"Workcrute قيد الصيانة مؤقتاً."}}');

CREATE TABLE IF NOT EXISTS platform_brand_assets (
  kind TEXT PRIMARY KEY CHECK(kind IN ('logo','favicon')),
  content_type TEXT NOT NULL,
  data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
