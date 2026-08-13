const canonical = {
  extensions: ["pdf", "doc", "docx"],
  documentTypes: ["cv", "cover_letter", "diploma", "certificate", "portfolio", "other"],
  applicationStatuses: ["submitted", "reviewing", "shortlisted", "interview", "accepted", "rejected", "withdrawn"],
  interviewTypes: ["onsite", "phone", "video"],
  jobFields: ["title", "domain", "description", "contractType", "city", "workMode", "skills", "experienceLevel", "educationLevel", "salary"],
  matchingKeys: ["skills", "experience", "education", "location", "contract", "availability", "questionnaire"],
};

export const PLATFORM_DEFAULTS = Object.freeze({
  general: { siteName: "Workcrute", supportEmail: "", supportPhone: "" },
  registrations: { candidateEnabled: true, recruiterEnabled: true, emailVerificationRequired: true, cvRequired: false },
  documents: { extensions: [...canonical.extensions], maxSizeMb: 8, maxCount: 20, types: [...canonical.documentTypes] },
  jobs: { sectors: ["Informatique", "Commerce", "Logistique", "Industrie", "Services", "Santé", "Finance", "BTP", "Tourisme", "Éducation"], contractTypes: ["CDI", "CDD", "Stage", "Alternance", "Freelance"], publicationDays: 30, requiredFields: ["title", "domain", "description", "contractType", "city", "workMode"] },
  applications: { statuses: [...canonical.applicationStatuses], withdrawalEnabled: true, rules: { coverLetterRequired: false, completeProfileRequired: false, cvRequired: false } },
  interviews: { types: [...canonical.interviewTypes], defaultDurations: { onsite: 60, phone: 30, video: 45 } },
  matching: { enabled: true, weights: { skills: 25, experience: 15, education: 10, location: 10, contract: 10, availability: 10, questionnaire: 20 }, recommendedThreshold: 70 },
  chatbot: { enabled: true, welcome: { fr: "Bonjour, comment puis-je vous aider ?", en: "Hello, how can I help you?", ar: "مرحباً، كيف يمكنني مساعدتك؟" }, similarityThreshold: 0.43, supportContact: "" },
  maintenance: { enabled: false, message: { fr: "Workcrute est temporairement en maintenance.", en: "Workcrute is temporarily under maintenance.", ar: "Workcrute قيد الصيانة مؤقتاً." } },
  recruiter_access: { globalCandidateDatabaseEnabled: false },
});

const text = (value, max = 160) => typeof value === "string" && value.trim().length <= max ? value.trim() : "";
const uniqueText = (value, maxItems = 100) => Array.isArray(value) ? [...new Set(value.map((item) => text(item)).filter(Boolean))].slice(0, maxItems) : [];
const subset = (value, allowed) => uniqueText(value).filter((item) => allowed.includes(item));
const bool = (value) => value === true;
const number = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : null;
const multilingual = (value, max = 500) => {
  const result = Object.fromEntries(["fr", "en", "ar"].map((lang) => [lang, text(value?.[lang], max)]));
  return Object.values(result).every(Boolean) ? result : null;
};

export function validatePlatformSection(section, input) {
  if (!input || typeof input !== "object") throw new Error("INVALID_SETTINGS");
  if (section === "general") {
    const value = { siteName: text(input.siteName, 80), supportEmail: text(input.supportEmail, 254).toLowerCase(), supportPhone: text(input.supportPhone, 30) };
    if (!value.siteName || (value.supportEmail && !/^\S+@\S+\.\S+$/.test(value.supportEmail))) throw new Error("INVALID_SETTINGS");
    return value;
  }
  if (section === "registrations") return { candidateEnabled: bool(input.candidateEnabled), recruiterEnabled: bool(input.recruiterEnabled), emailVerificationRequired: bool(input.emailVerificationRequired), cvRequired: bool(input.cvRequired) };
  if (section === "documents") {
    const value = { extensions: subset(input.extensions, canonical.extensions), maxSizeMb: number(input.maxSizeMb, 1, 20), maxCount: number(input.maxCount, 1, 50), types: subset(input.types, canonical.documentTypes) };
    if (!value.extensions.length || !value.types.length || !Number.isInteger(value.maxCount)) throw new Error("INVALID_SETTINGS");
    return value;
  }
  if (section === "jobs") {
    const value = { sectors: uniqueText(input.sectors), contractTypes: uniqueText(input.contractTypes, 30), publicationDays: number(input.publicationDays, 1, 365), requiredFields: subset(input.requiredFields, canonical.jobFields) };
    if (!value.sectors.length || !value.contractTypes.length || !Number.isInteger(value.publicationDays)) throw new Error("INVALID_SETTINGS");
    return value;
  }
  if (section === "applications") {
    const statuses = subset(input.statuses, canonical.applicationStatuses);
    if (!statuses.includes("submitted") || !statuses.length) throw new Error("INVALID_SETTINGS");
    return { statuses, withdrawalEnabled: bool(input.withdrawalEnabled), rules: { coverLetterRequired: bool(input.rules?.coverLetterRequired), completeProfileRequired: bool(input.rules?.completeProfileRequired), cvRequired: bool(input.rules?.cvRequired) } };
  }
  if (section === "interviews") {
    const types = subset(input.types, canonical.interviewTypes), durations = {};
    for (const type of types) { const duration = number(input.defaultDurations?.[type], 10, 480); if (!Number.isInteger(duration)) throw new Error("INVALID_SETTINGS"); durations[type] = duration; }
    if (!types.length) throw new Error("INVALID_SETTINGS");
    return { types, defaultDurations: durations };
  }
  if (section === "matching") {
    const weights = {}; let total = 0;
    for (const key of canonical.matchingKeys) { const value = number(input.weights?.[key], 0, 100); if (value === null) throw new Error("INVALID_SETTINGS"); weights[key] = value; total += value; }
    const threshold = number(input.recommendedThreshold, 0, 100);
    if (total !== 100 || threshold === null) throw new Error("MATCHING_WEIGHTS_TOTAL");
    return { enabled: bool(input.enabled), weights, recommendedThreshold: threshold };
  }
  if (section === "chatbot") {
    const welcome = multilingual(input.welcome, 500), threshold = number(input.similarityThreshold, 0.1, 0.95);
    if (!welcome || threshold === null) throw new Error("INVALID_SETTINGS");
    return { enabled: bool(input.enabled), welcome, similarityThreshold: threshold, supportContact: text(input.supportContact, 254) };
  }
  if (section === "maintenance") {
    const message = multilingual(input.message, 1000);
    if (!message) throw new Error("INVALID_SETTINGS");
    return { enabled: bool(input.enabled), message };
  }
  if (section === "recruiter_access") return { globalCandidateDatabaseEnabled: bool(input.globalCandidateDatabaseEnabled) };
  throw new Error("UNKNOWN_SETTINGS_SECTION");
}

export async function getPlatformSettings(env) {
  const { results = [] } = await env.DB.prepare("SELECT section,value_json,updated_at FROM platform_settings").all();
  const result = structuredClone(PLATFORM_DEFAULTS);
  for (const row of results) {
    try { result[row.section] = { ...result[row.section], ...JSON.parse(row.value_json), updatedAt: row.updated_at }; } catch {}
  }
  return result;
}

export async function savePlatformSection(env, section, input) {
  const value = validatePlatformSection(section, input);
  await env.DB.prepare("INSERT INTO platform_settings(section,value_json,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(section) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(section, JSON.stringify(value)).run();
  return value;
}

export const platformCanonicalValues = canonical;
