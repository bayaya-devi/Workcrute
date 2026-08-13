import { FAQ_CATALOG } from "./faq-catalog.js";
import {
  enqueueAdminEmail,
  processAdminEmailOutbox,
} from "./admin-email.js";
import {
  classifyError,
  normalizeApiError,
  recordAppError,
} from "./error-system.js";
import {
  getPlatformSettings,
  savePlatformSection,
  platformCanonicalValues,
} from "./platform-settings.js";

const encoder = new TextEncoder();
const fileTypes = new Map([
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx",
  ],
]);
const documentKinds = [
  "cv",
  "cover_letter",
  "diploma",
  "certificate",
  "portfolio",
  "other",
];
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
const bad = (message, status = 400) => json({ error: message }, status);
const now = () => new Date().toISOString();
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
const clean = (value, max = 500) =>
  typeof value === "string" && value.trim().length <= max ? value.trim() : "";
const list = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? clean(item, 160) : item))
        .filter(Boolean)
    : [];
const parseStored = (value, fallback) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : (value ?? fallback);
  } catch {
    return fallback;
  }
};
const questionnaireTypes = new Set([
  "short_text",
  "long_text",
  "number",
  "boolean",
  "single_choice",
  "multiple_choice",
  "date",
  "rating",
  "upload",
]);
const multilingual = (value, max = 500, required = false) => {
  const result = {
    fr: clean(value?.fr, max),
    en: clean(value?.en, max),
    ar: clean(value?.ar, max),
  };
  return required && (!result.fr || !result.en || !result.ar) ? null : result;
};
const cors = (request) => ({
  "access-control-allow-origin": new URL(request.url).origin,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type, x-turnstile-token",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
});
const validPhone = (value) =>
  /^\+212[5-7]\d{8}$/.test(String(value || "").replace(/[\s.-]/g, ""));
const validPassword = (value) =>
  typeof value === "string" &&
  value.length >= 8 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value);
function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(bytes)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 310000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
const cookie = (name, value, maxAge = 0) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const sessionToken = (request) =>
  request.headers.get("cookie")?.match(/(?:^|;\s*)wc_session=([^;]+)/)?.[1] ||
  null;
async function userFor(request, env) {
  const raw = sessionToken(request);
  if (!raw) return null;
  return env.DB.prepare(
    "SELECT u.id,u.email,u.role,u.email_verified_at,s.id session_id,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.account_status='active'",
  )
    .bind(await digest(raw + env.SESSION_PEPPER), now())
    .first();
}
async function requireUser(request, env, roles) {
  const user = await userFor(request, env);
  if (!user) throw bad("Authentification requise.", 401);
  if (roles && !roles.includes(user.role)) throw bad("Accès interdit.", 403);
  return user;
}
async function createSession(env, userId) {
  const raw = token();
  await env.DB.prepare(
    "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      userId,
      await digest(raw + env.SESSION_PEPPER),
      future(30),
    )
    .run();
  return raw;
}
async function audit(env, user, action, type, id, metadata = {}) {
  await env.DB.prepare(
    "INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id,metadata_json) VALUES(?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      user?.id || null,
      action,
      type,
      id || null,
      JSON.stringify(metadata),
    )
    .run();
  const event = {
    profile_updated: [
      "PROFILE_UPDATED",
      user?.role === "recruiter" ? "recruiters" : "candidates",
    ],
    document_uploaded: ["DOCUMENT_UPLOADED", "candidates"],
    job_created: ["JOB_CREATED", "jobs"],
    job_published: ["JOB_PUBLISHED", "jobs"],
    application_status_changed: ["APPLICATION_STATUS_CHANGED", "applications"],
  }[action];
  if (event)
    await platformEvent(env, event[0], event[1], user?.id, type, id, metadata);
}
async function platformEvent(
  env,
  eventType,
  category,
  actorUserId = null,
  resourceType = null,
  resourceId = null,
  metadata = {},
) {
  await env.DB.prepare(
    "INSERT INTO platform_events(event_type,category,actor_user_id,resource_type,resource_id,metadata_json) VALUES(?,?,?,?,?,?)",
  )
    .bind(
      eventType,
      category,
      actorUserId,
      resourceType,
      resourceId,
      JSON.stringify(metadata),
    )
    .run();
}
async function profile(env, user) {
  if (user.role === "candidate")
    return env.DB.prepare(
      "SELECT first_name,last_name,phone,city,region,country,preferred_language,professional_title,introduction,availability,availability_details,profile_visible,skills_json,preferences_json,experience_json,education_json,languages_json,questionnaire_answers,updated_at FROM candidate_profiles WHERE user_id=?",
    )
      .bind(user.id)
      .first();
  if (user.role === "recruiter")
    return env.DB.prepare(
      "SELECT first_name,last_name,phone,company_name,job_title,company_sector,company_size,city,website FROM recruiter_profiles WHERE user_id=?",
    )
      .bind(user.id)
      .first();
  return null;
}
async function emailToken(env, userId, purpose) {
  const raw = token();
  await env.DB.prepare(
    "INSERT INTO email_tokens(id,user_id,token_hash,purpose,expires_at) VALUES(?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      userId,
      await digest(raw + env.SESSION_PEPPER),
      purpose,
      future(1),
    )
    .run();
  return raw;
}
async function sendEmail(env, message) {
  if (env.ENVIRONMENT === "test") return true;
  if (!env.EMAIL_FROM) return false;
  const subjects = {
    admin_verification: "Votre code de vérification Workcrute",
    admin_test: "Email administratif Workcrute opérationnel",
    verify_email: "Vérifiez votre adresse Workcrute",
    reset_password: "Réinitialisez votre mot de passe Workcrute",
  };
  const content = message.code
    ? `Votre code Workcrute est : ${message.code}. Il expire dans 10 minutes.`
    : message.template === "admin_test"
      ? "La messagerie administrative Workcrute est correctement configurée."
      : "Une action de sécurité a été demandée sur votre compte Workcrute.";
  if (env.EMAIL?.send) {
    await env.EMAIL.send({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: subjects[message.template] || "Notification Workcrute",
      text: content,
    });
    return true;
  }
  if (!env.EMAIL_PROVIDER_API_KEY) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: subjects[message.template] || "Notification Workcrute",
      text: content,
    }),
  });
  return response.ok;
}

async function register(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return bad("Données invalides.");
  const role = ["candidate", "recruiter"].includes(body.role)
      ? body.role
      : null,
    email = clean(body.email, 254).toLowerCase(),
    first = clean(body.firstName, 80),
    last = clean(body.lastName, 80),
    phone = clean(body.phone, 20).replace(/[\s.-]/g, "");
  const platform = await getPlatformSettings(env);
  if (role === "candidate" && !platform.registrations.candidateEnabled)
    return bad("Les inscriptions candidat sont temporairement fermées.", 403);
  if (role === "recruiter" && !platform.registrations.recruiterEnabled)
    return bad("Les inscriptions recruteur sont temporairement fermées.", 403);
  if (
    !role ||
    !first ||
    !last ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    !validPhone(phone) ||
    !validPassword(body.password) ||
    body.acceptedTerms !== true
  )
    return bad("Veuillez vérifier les informations du formulaire.");
  if (body.password !== body.confirmPassword)
    return bad("Les mots de passe ne correspondent pas.");
  if (
    await env.DB.prepare("SELECT id FROM users WHERE email=?")
      .bind(email)
      .first()
  )
    return bad("Impossible de créer ce compte avec ces informations.", 409);
  const id = crypto.randomUUID(),
    salt = token(),
    hash = await hashPassword(body.password, salt);
  const candidateAnswers =
    body.questionnaireAnswers && typeof body.questionnaireAnswers === "object"
      ? body.questionnaireAnswers
      : {
          domain: clean(body.domain, 120),
          contract: clean(body.contract, 80),
          experience: clean(body.experience, 120),
          workMode: clean(body.workMode, 80),
          skills: list(body.skills),
        };
  const recruiterAnswers = {
    recruitmentDomains: list(body.recruitmentDomains),
    plannedHires: clean(body.plannedHires, 80),
    hiringDelay: clean(body.hiringDelay, 80),
    needs: clean(body.recruitmentNeeds, 1000),
  };
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users(id,email,password_hash,password_salt,role,email_verified_at) VALUES(?,?,?,?,?,?)",
    ).bind(id, email, hash, salt, role, platform.registrations.emailVerificationRequired ? null : now()),
    role === "candidate"
      ? env.DB.prepare(
          "INSERT INTO candidate_profiles(user_id,first_name,last_name,phone,city,region,preferred_language,professional_title,introduction,availability,skills_json,preferences_json,questionnaire_answers) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).bind(
          id,
          first,
          last,
          phone,
          clean(body.city, 120) || null,
          clean(body.region, 120) || null,
          ["fr", "en", "ar"].includes(body.language) ? body.language : "fr",
          clean(body.professionalTitle || body.jobTitle, 120) || null,
          clean(body.introduction, 1000) || null,
          clean(body.availability, 80) || null,
          JSON.stringify(list(body.skills)),
          JSON.stringify({
            domain: candidateAnswers.domain || null,
            contract: candidateAnswers.contract || null,
            workMode: candidateAnswers.workMode || null,
          }),
          JSON.stringify(candidateAnswers),
        )
      : env.DB.prepare(
          "INSERT INTO recruiter_profiles(user_id,first_name,last_name,phone,company_name,job_title,company_sector,company_size,city,website,questionnaire_answers) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        ).bind(
          id,
          first,
          last,
          phone,
          clean(body.companyName, 120) || null,
          clean(body.jobTitle, 120) || null,
          clean(body.companySector, 120) || null,
          clean(body.companySize, 80) || null,
          clean(body.city, 120) || null,
          clean(body.website, 240) || null,
          JSON.stringify(recruiterAnswers),
        ),
    env.DB.prepare(
      "INSERT INTO notifications(id,user_id,type,title,body) VALUES(?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      id,
      "account",
      "Bienvenue sur Workcrute",
      "Complétez votre profil pour améliorer vos opportunités.",
    ),
  ]);
  if (platform.registrations.emailVerificationRequired) {
    const verify = await emailToken(env, id, "verify_email");
    try {
      await sendEmail(env, { to: email, template: "verify_email", token: verify });
    } catch (error) {
      console.error(JSON.stringify({ event: "verification_email_failed", userId: id, error: String(error) }));
    }
  }
  const session = await createSession(env, id);
  await platformEvent(
    env,
    "USER_REGISTERED",
    role === "candidate" ? "candidates" : "recruiters",
    id,
    "user",
    id,
    { role },
  );
  try {
    await enqueueAdminEmail(
      env,
      role === "candidate" ? "new_candidate" : "new_recruiter",
      "user",
      id,
      { delaySeconds: role === "candidate" ? 90 : 10 },
    );
  } catch (error) {
    console.error(JSON.stringify({ event: "admin_email_enqueue_failed", resourceType: "user", resourceId: id, error: String(error) }));
  }
  return json(
    { user: { id, email, role }, emailVerificationPending: platform.registrations.emailVerificationRequired, cvRequired: role === "candidate" && platform.registrations.cvRequired },
    201,
    { "set-cookie": cookie("wc_session", session, 2592000) },
  );
}
async function login(request, env) {
  const body = await request.json().catch(() => ({})),
    email = clean(body.email, 254).toLowerCase();
  const user = await env.DB.prepare("SELECT * FROM users WHERE email=?")
    .bind(email)
    .first();
  if (!user || typeof body.password !== "string")
    return bad("Identifiants invalides.", 401);
  if (user.account_status === "suspended")
    return bad("Ce compte est suspendu.", 403);
  const hash = await hashPassword(body.password, user.password_salt);
  if (hash !== user.password_hash) return bad("Identifiants invalides.", 401);
  const session = await createSession(env, user.id);
  await platformEvent(
    env,
    "USER_LOGIN",
    user.role === "candidate" ? "candidates" : "recruiters",
    user.id,
    "user",
    user.id,
    { role: user.role },
  );
  return json(
    { user: { id: user.id, email: user.email, role: user.role } },
    200,
    { "set-cookie": cookie("wc_session", session, 2592000) },
  );
}
async function authAction(request, env, purpose) {
  const body = await request.json().catch(() => ({})),
    email = clean(body.email, 254).toLowerCase(),
    user = email
      ? await env.DB.prepare("SELECT id,email FROM users WHERE email=?")
          .bind(email)
          .first()
      : null;
  if (user) {
    const value = await emailToken(env, user.id, purpose);
    await sendEmail(env, { to: user.email, template: purpose, token: value });
  }
  return json({ ok: true });
}
async function me(request, env) {
  const user = await requireUser(request, env);
  return json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: Boolean(user.email_verified_at),
    },
    profile: await profile(env, user),
  });
}
async function updateProfile(request, env) {
  const user = await requireUser(request, env);
  const body = await request.json().catch(() => null);
  if (!body) return bad("Données invalides.");
  if (user.role === "recruiter") {
    await env.DB.prepare(
      "UPDATE recruiter_profiles SET company_name=?,job_title=?,company_sector=?,company_size=?,city=?,website=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
    )
      .bind(
        clean(body.companyName, 160) || null,
        clean(body.jobTitle, 120) || null,
        clean(body.companySector, 120) || null,
        clean(body.companySize, 80) || null,
        clean(body.city, 120) || null,
        clean(body.website, 240) || null,
        user.id,
      )
      .run();
    await audit(env, user, "profile_updated", "recruiter_profile", user.id);
    return me(request, env);
  }
  if (user.role !== "candidate") return bad("Profil candidat requis.", 403);
  const previous = await profile(env, user),
    availability =
      body.availability === undefined
        ? previous.availability || ""
        : ["immediate", "one_month", "two_months", "other", ""].includes(
              body.availability,
            )
          ? body.availability
          : "";
  if (
    availability === "other" &&
    !clean(body.availabilityDetails ?? previous.availability_details, 160)
  )
    return bad("Précisez votre disponibilité.");
  const first = clean(body.firstName ?? previous.first_name, 80),
    last = clean(body.lastName ?? previous.last_name, 80),
    phone = clean(body.phone ?? previous.phone, 20);
  if (!first || !last || !validPhone(phone))
    return bad("Vérifiez votre identité et votre téléphone.");
  const oldList = (key) => parseStored(previous[key], []),
    oldObject = (key) => parseStored(previous[key], {});
  await env.DB.prepare(
    "UPDATE candidate_profiles SET first_name=?,last_name=?,phone=?,city=?,region=?,country=?,preferred_language=?,professional_title=?,introduction=?,availability=?,availability_details=?,skills_json=?,preferences_json=?,experience_json=?,education_json=?,languages_json=?,questionnaire_answers=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
  )
    .bind(
      first,
      last,
      phone.replace(/[\s.-]/g, ""),
      clean(body.city ?? previous.city, 120) || null,
      clean(body.region ?? previous.region, 120) || null,
      clean(body.country ?? previous.country, 120) || null,
      ["fr", "en", "ar"].includes(body.language)
        ? body.language
        : previous.preferred_language || "fr",
      clean(body.professionalTitle ?? previous.professional_title, 120) || null,
      clean(body.introduction ?? previous.introduction, 1000) || null,
      availability || null,
      availability === "other"
        ? clean(body.availabilityDetails ?? previous.availability_details, 160)
        : null,
      JSON.stringify(
        body.skills === undefined ? oldList("skills_json") : list(body.skills),
      ),
      JSON.stringify(
        body.preferences === undefined
          ? oldObject("preferences_json")
          : body.preferences && typeof body.preferences === "object"
            ? body.preferences
            : {},
      ),
      JSON.stringify(
        body.experience === undefined
          ? oldList("experience_json")
          : list(body.experience),
      ),
      JSON.stringify(
        body.education === undefined
          ? oldList("education_json")
          : list(body.education),
      ),
      JSON.stringify(
        body.languages === undefined
          ? oldList("languages_json")
          : list(body.languages),
      ),
      JSON.stringify(
        body.questionnaireAnswers === undefined
          ? oldObject("questionnaire_answers")
          : body.questionnaireAnswers &&
              typeof body.questionnaireAnswers === "object"
            ? body.questionnaireAnswers
            : {},
      ),
      user.id,
    )
    .run();
  await audit(env, user, "profile_updated", "candidate_profile", user.id);
  return me(request, env);
}

async function storeDocument(env, documentId, storageKey, file, owner, kind) {
  if (env.DOCUMENTS) {
    await env.DOCUMENTS.put(storageKey, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { owner, kind },
    });
    return;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunkSize = 512 * 1024;
  const statements = [];
  for (
    let offset = 0, index = 0;
    offset < bytes.length;
    offset += chunkSize, index += 1
  )
    statements.push(
      env.DB.prepare(
        "INSERT INTO document_chunks(document_id,chunk_index,data) VALUES(?,?,?)",
      ).bind(documentId, index, bytes.slice(offset, offset + chunkSize)),
    );
  if (statements.length) await env.DB.batch(statements);
}
async function loadDocument(env, documentId, storageKey) {
  if (env.DOCUMENTS) {
    const object = await env.DOCUMENTS.get(storageKey);
    return object?.body || null;
  }
  const { results = [] } = await env.DB.prepare(
    "SELECT data FROM document_chunks WHERE document_id=? ORDER BY chunk_index",
  )
    .bind(documentId)
    .all();
  if (!results.length) return null;
  const chunks = results.map((row) => new Uint8Array(row.data));
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
async function removeDocument(env, documentId, storageKey) {
  if (env.DOCUMENTS) await env.DOCUMENTS.delete(storageKey);
  else
    await env.DB.prepare("DELETE FROM document_chunks WHERE document_id=?")
      .bind(documentId)
      .run();
}

async function documents(request, env, path) {
  const user = await requireUser(request, env, ["candidate"]);
  if (path === "/api/documents" && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT id,kind,original_name,content_type,size_bytes,is_default,created_at FROM documents WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC",
    )
      .bind(user.id)
      .all();
    return json({ items: results });
  }
  if (path === "/api/documents" && request.method === "POST") {
    const form = await request.formData(),
      file = form.get("file"),
      kind = String(form.get("kind") || "");
    const platform = await getPlatformSettings(env), rules = platform.documents;
    if (!(file instanceof File) || !documentKinds.includes(kind) || !rules.types.includes(kind))
      return bad("Document invalide.");
    const ext = fileTypes.get(file.type);
    if (!ext || !rules.extensions.includes(ext) || !file.name.toLowerCase().endsWith("." + ext))
      return bad(`Format invalide : extensions autorisées ${rules.extensions.join(", ").toUpperCase()}.`, 415);
    if (!file.size || file.size > rules.maxSizeMb * 1024 * 1024)
      return bad(`Fichier trop gros : la taille maximale est de ${rules.maxSizeMb} Mo.`, 413);
    const total = await env.DB.prepare("SELECT COUNT(*) total FROM documents WHERE user_id=? AND deleted_at IS NULL").bind(user.id).first();
    if (Number(total?.total || 0) >= rules.maxCount)
      return bad(`Vous avez atteint la limite de ${rules.maxCount} documents.`, 409);
    const id = crypto.randomUUID(),
      key = `private/${user.id}/${id}.${ext}`;
    const count = await env.DB.prepare(
      "SELECT COUNT(*) total FROM documents WHERE user_id=? AND kind='cv' AND deleted_at IS NULL",
    )
      .bind(user.id)
      .first();
    const isDefault = kind === "cv" && count.total === 0 ? 1 : 0;
    await env.DB.prepare(
      "INSERT INTO documents(id,user_id,kind,storage_key,original_name,content_type,size_bytes,is_default) VALUES(?,?,?,?,?,?,?,?)",
    )
      .bind(id, user.id, kind, key, file.name, file.type, file.size, isDefault)
      .run();
    try {
      await storeDocument(env, id, key, file, user.id, kind);
    } catch (error) {
      await env.DB.prepare("DELETE FROM documents WHERE id=?").bind(id).run();
      throw new Error(`STORAGE_WRITE_FAILED: ${String(error)}`);
    }
    await audit(env, user, "document_uploaded", "document", id, { kind });
    return json(
      {
        document: { id, kind, original_name: file.name, is_default: isDefault },
      },
      201,
    );
  }
  const match = path.match(
    /^\/api\/documents\/([^/]+)(?:\/(download|default))?$/,
  );
  if (!match) return bad("Action non prise en charge.", 405);
  const [, id, action] = match,
    doc = await env.DB.prepare(
      "SELECT * FROM documents WHERE id=? AND user_id=? AND deleted_at IS NULL",
    )
      .bind(id, user.id)
      .first();
  if (!doc) return bad("Document introuvable.", 404);
  if (action === "download" && request.method === "GET") {
    const body = await loadDocument(env, doc.id, doc.storage_key);
    if (!body) return bad("Fichier introuvable.", 404);
    return new Response(body, {
      headers: {
        "content-type": doc.content_type,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`,
      },
    });
  }
  if (action === "default" && request.method === "PATCH") {
    if (doc.kind !== "cv") return bad("Seul un CV peut être principal.");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE documents SET is_default=0 WHERE user_id=? AND kind='cv'",
      ).bind(user.id),
      env.DB.prepare("UPDATE documents SET is_default=1 WHERE id=?").bind(id),
    ]);
    return json({ ok: true });
  }
  if (!action && request.method === "DELETE") {
    await removeDocument(env, doc.id, doc.storage_key);
    await env.DB.prepare(
      "UPDATE documents SET deleted_at=CURRENT_TIMESTAMP,is_default=0 WHERE id=?",
    )
      .bind(id)
      .run();
    return new Response(null, { status: 204 });
  }
  return bad("Action non prise en charge.", 405);
}
async function notifications(request, env, path) {
  const user = await requireUser(request, env);
  if (path === "/api/notifications" && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT id,type,title,body,href,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
    )
      .bind(user.id)
      .all();
    return json({ items: results });
  }
  if (path === "/api/notifications" && request.method === "POST") {
    await env.DB.prepare(
      "UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=?",
    )
      .bind(user.id)
      .run();
    return new Response(null, { status: 204 });
  }
  const id = path.split("/").pop();
  if (request.method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    await env.DB.prepare(
      body.read === false
        ? "UPDATE notifications SET read_at=NULL WHERE id=? AND user_id=?"
        : "UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
    )
      .bind(id, user.id)
      .run();
    return json({ ok: true });
  }
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM notifications WHERE id=? AND user_id=?")
      .bind(id, user.id)
      .run();
    return new Response(null, { status: 204 });
  }
  return bad("Action non prise en charge.", 405);
}
async function candidateStats(request, env) {
  const user = await requireUser(request, env, ["candidate"]);
  const row = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM applications WHERE candidate_user_id=?) applications_sent,(SELECT COUNT(*) FROM applications WHERE candidate_user_id=? AND status IN ('reviewing','shortlisted','interview')) applications_active,(SELECT COUNT(*) FROM interviews WHERE candidate_user_id=? AND starts_at>CURRENT_TIMESTAMP AND status IN ('scheduled','confirmed')) interviews,(SELECT COUNT(DISTINCT viewer_user_id) FROM profile_views WHERE profile_owner_id=? AND viewer_role='recruiter' AND viewer_user_id IS NOT NULL) recruiter_views",
  )
    .bind(user.id, user.id, user.id, user.id)
    .first();
  return json({
    applicationsSent: row.applications_sent || 0,
    applicationsActive: row.applications_active || 0,
    interviews: row.interviews || 0,
    recruiterViews: row.recruiter_views || 0,
  });
}

async function jobs(request, env, path) {
  const url = new URL(request.url),
    user = await userFor(request, env);
  if (request.method === "GET" && path === "/api/jobs") {
    let sql =
        "SELECT j.id,j.title,j.domain,j.description,j.contract_type,j.city,j.work_mode,j.experience_level,j.published_at,c.name company_name" +
        (user?.role === "candidate"
          ? ",EXISTS(SELECT 1 FROM saved_jobs s WHERE s.job_offer_id=j.id AND s.user_id=?) is_saved"
          : "") +
        " FROM job_offers j LEFT JOIN companies c ON c.id=j.company_id WHERE j.status='published' AND (j.deadline_at IS NULL OR j.deadline_at>=CURRENT_TIMESTAMP)",
      params = user?.role === "candidate" ? [user.id] : [];
    for (const [value, clause, count] of [
      [
        clean(url.searchParams.get("q"), 100),
        " AND (j.title LIKE ? OR j.description LIKE ? OR j.domain LIKE ?)",
        3,
      ],
      [clean(url.searchParams.get("domain"), 100), " AND j.domain=?", 1],
      [clean(url.searchParams.get("city"), 100), " AND j.city=?", 1],
      [
        clean(url.searchParams.get("contract"), 50),
        " AND j.contract_type=?",
        1,
      ],
    ])
      if (value) {
        sql += clause;
        params.push(...Array(count).fill(count === 3 ? `%${value}%` : value));
      }
    const { results = [] } = await env.DB.prepare(
      sql + " ORDER BY j.published_at DESC LIMIT 50",
    )
      .bind(...params)
      .all();
    return json({ items: results });
  }
  if (request.method === "GET" && path.startsWith("/api/jobs/")) {
    const id = path.split("/").pop();
    const job = await env.DB.prepare(
      "SELECT j.*,c.name company_name" +
        (user?.role === "candidate"
          ? ",EXISTS(SELECT 1 FROM saved_jobs s WHERE s.job_offer_id=j.id AND s.user_id=?) is_saved"
          : "") +
        " FROM job_offers j LEFT JOIN companies c ON c.id=j.company_id WHERE j.id=? AND (j.status='published' OR j.recruiter_user_id=?)",
    )
      .bind(
        ...(user?.role === "candidate" ? [user.id] : []),
        id,
        user?.id || "",
      )
      .first();
    if (!job) return bad("Offre introuvable.", 404);
    let applicationQuestionnaire = null;
    if (job.questionnaire_id) {
      const questionnaire = await env.DB.prepare(
        "SELECT id,name,description FROM recruiter_questionnaires WHERE id=?",
      )
        .bind(job.questionnaire_id)
        .first();
      if (questionnaire) {
        const { results = [] } = await env.DB.prepare(
          "SELECT id,label_json,description_json,help_json,placeholder_json,question_type,options_json,is_required,weight,is_eliminatory,validation_json,condition_json,sort_order FROM recruiter_questions WHERE questionnaire_id=? ORDER BY sort_order,created_at",
        )
          .bind(job.questionnaire_id)
          .all();
        applicationQuestionnaire = {
          ...questionnaire,
          questions: results.map(parsedQuestion),
        };
      }
    }
    return json({
      job,
      matchingScore: null,
      questionnaire: applicationQuestionnaire,
    });
  }
  const actor = await requireUser(request, env, ["recruiter"]);
  if (path === "/api/jobs" && request.method === "POST") {
    const body = await request.json().catch(() => null);
    if (!body) return bad("Données invalides.");
    const title = clean(body.title, 160),
      domain = clean(body.domain, 120),
      description = clean(body.description, 5000),
      contract = clean(body.contractType, 80),
      city = clean(body.city, 120),
      mode = clean(body.workMode, 40);
    if (!title || !domain || !description || !contract || !city || !mode)
      return bad("Veuillez renseigner les champs obligatoires.");
    let company = await env.DB.prepare(
      "SELECT id FROM companies WHERE owner_user_id=?",
    )
      .bind(actor.id)
      .first();
    if (!company) {
      company = { id: crypto.randomUUID() };
      await env.DB.prepare(
        "INSERT INTO companies(id,owner_user_id,name,sector,city) VALUES(?,?,?,?,?)",
      )
        .bind(
          company.id,
          actor.id,
          clean(body.companyName, 160) || "Entreprise",
          clean(body.companySector, 120) || null,
          city,
        )
        .run();
    }
    const id = crypto.randomUUID(),
      status = body.status === "published" ? "published" : "draft";
    await env.DB.prepare(
      "INSERT INTO job_offers(id,recruiter_user_id,company_id,title,domain,description,missions,required_skills,contract_type,city,work_mode,status,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        actor.id,
        company.id,
        title,
        domain,
        description,
        clean(body.missions, 5000) || null,
        JSON.stringify(list(body.skills)),
        contract,
        city,
        mode,
        status,
        status === "published" ? now() : null,
      )
      .run();
    return json({ job: { id, status } }, 201);
  }
  return bad("Action non prise en charge.", 405);
}
async function savedJobs(request, env, path) {
  const user = await requireUser(request, env, ["candidate"]);
  if (path === "/api/saved-jobs" && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT j.id,j.title,j.domain,j.description,j.contract_type,j.city,j.work_mode,j.published_at,c.name company_name,1 is_saved FROM saved_jobs s JOIN job_offers j ON j.id=s.job_offer_id LEFT JOIN companies c ON c.id=j.company_id WHERE s.user_id=? AND j.status='published' ORDER BY s.created_at DESC",
    )
      .bind(user.id)
      .all();
    return json({ items: results });
  }
  const jobId = path.split("/").pop();
  if (request.method === "POST") {
    if (
      !(await env.DB.prepare(
        "SELECT id FROM job_offers WHERE id=? AND status='published'",
      )
        .bind(jobId)
        .first())
    )
      return bad("Offre introuvable.", 404);
    await env.DB.prepare(
      "INSERT OR IGNORE INTO saved_jobs(user_id,job_offer_id) VALUES(?,?)",
    )
      .bind(user.id, jobId)
      .run();
    return json({ saved: true }, 201);
  }
  if (request.method === "DELETE") {
    await env.DB.prepare(
      "DELETE FROM saved_jobs WHERE user_id=? AND job_offer_id=?",
    )
      .bind(user.id, jobId)
      .run();
    return new Response(null, { status: 204 });
  }
  return bad("Action non prise en charge.", 405);
}
async function alerts(request, env, path) {
  const user = await requireUser(request, env, ["candidate"]);
  if (path === "/api/job-alerts" && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT * FROM job_alerts WHERE user_id=? ORDER BY created_at DESC",
    )
      .bind(user.id)
      .all();
    return json({ items: results });
  }
  if (path === "/api/job-alerts" && request.method === "POST") {
    const body = await request.json().catch(() => null);
    if (!body) return bad("Données invalides.");
    if (
      !clean(body.keywords, 160) &&
      !clean(body.domain, 120) &&
      !clean(body.city, 120) &&
      !clean(body.contractType, 80) &&
      !list(body.skills).length
    )
      return bad("Choisissez au moins un critère.");
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO job_alerts(id,user_id,name,keywords,domain,city,contract_type,work_mode,skills_json,frequency,in_app_enabled,email_enabled) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        user.id,
        clean(body.name, 120) || null,
        clean(body.keywords, 160) || null,
        clean(body.domain, 120) || null,
        clean(body.city, 120) || null,
        clean(body.contractType, 80) || null,
        clean(body.workMode, 80) || null,
        JSON.stringify(list(body.skills)),
        ["immediate", "daily", "weekly"].includes(body.frequency)
          ? body.frequency
          : "daily",
        body.inApp === false ? 0 : 1,
        body.email ? 1 : 0,
      )
      .run();
    return json({ alert: { id } }, 201);
  }
  const id = path.split("/").pop();
  if (request.method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    await env.DB.prepare(
      "UPDATE job_alerts SET is_active=COALESCE(?,is_active),frequency=COALESCE(?,frequency),updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
    )
      .bind(
        typeof body.active === "boolean" ? (body.active ? 1 : 0) : null,
        ["immediate", "daily", "weekly"].includes(body.frequency)
          ? body.frequency
          : null,
        id,
        user.id,
      )
      .run();
    return json({ ok: true });
  }
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM job_alerts WHERE id=? AND user_id=?")
      .bind(id, user.id)
      .run();
    return new Response(null, { status: 204 });
  }
  return bad("Action non prise en charge.", 405);
}
function answerMatchesExpected(answer, expected) {
  if (Array.isArray(answer)) {
    const expectedValues = Array.isArray(expected) ? expected : [expected];
    return expectedValues.every((value) =>
      answer.map(String).includes(String(value)),
    );
  }
  if (typeof expected === "boolean") return Boolean(answer) === expected;
  return (
    String(answer ?? "")
      .trim()
      .toLowerCase() ===
    String(expected ?? "")
      .trim()
      .toLowerCase()
  );
}

function conditionMatches(condition, answers) {
  if (!condition?.questionId) return true;
  const answer = answers[condition.questionId];
  const expected = condition.value;
  if (condition.operator === "not_equals")
    return !answerMatchesExpected(answer, expected);
  if (condition.operator === "contains")
    return Array.isArray(answer)
      ? answer.map(String).includes(String(expected))
      : String(answer ?? "").includes(String(expected ?? ""));
  if (condition.operator === "in") {
    const values = Array.isArray(expected) ? expected : [expected];
    return values.map(String).includes(String(answer));
  }
  return answerMatchesExpected(answer, expected);
}

async function evaluateQuestionnaire(env, questionnaireId, rawAnswers) {
  const answers =
    rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
      ? rawAnswers
      : {};
  const { results = [] } = await env.DB.prepare(
    "SELECT id,label_json,question_type,is_required,weight,is_eliminatory,validation_json,condition_json FROM recruiter_questions WHERE questionnaire_id=? ORDER BY sort_order,created_at",
  )
    .bind(questionnaireId)
    .all();
  const unmetCriteria = [];
  let earned = 0,
    possible = 0;
  for (const question of results) {
    const condition = parseStored(question.condition_json, {});
    if (!conditionMatches(condition, answers)) continue;
    const answer = answers[question.id];
    const empty =
      answer === undefined ||
      answer === null ||
      answer === "" ||
      (Array.isArray(answer) && !answer.length);
    if (question.is_required && empty)
      throw new Error("QUESTIONNAIRE_REQUIRED");
    if (empty) continue;
    const validation = parseStored(question.validation_json, {});
    let valid = true;
    const numeric = Number(answer);
    if (validation.min != null && Number.isFinite(numeric))
      valid = valid && numeric >= Number(validation.min);
    if (validation.max != null && Number.isFinite(numeric))
      valid = valid && numeric <= Number(validation.max);
    if (validation.minLength != null)
      valid = valid && String(answer).length >= Number(validation.minLength);
    if (validation.maxLength != null)
      valid = valid && String(answer).length <= Number(validation.maxLength);
    if (validation.pattern) {
      try {
        valid =
          valid && new RegExp(validation.pattern, "u").test(String(answer));
      } catch {
        valid = false;
      }
    }
    const scorable =
      validation.expectedValue !== undefined &&
      validation.expectedValue !== null &&
      validation.expectedValue !== "";
    const compliant =
      valid &&
      (!scorable || answerMatchesExpected(answer, validation.expectedValue));
    if (scorable && Number(question.weight) > 0) {
      possible += Number(question.weight);
      if (compliant) earned += Number(question.weight);
    }
    if (question.is_eliminatory && !compliant) {
      const label = parseStored(question.label_json, {});
      unmetCriteria.push({
        questionId: question.id,
        label,
        code: "CRITERION_NOT_MET",
      });
    }
  }
  return {
    score: possible ? Math.round((earned / possible) * 100) : null,
    unmetCriteria,
    evaluatedAt: now(),
  };
}

async function applications(request, env, path) {
  const user = await requireUser(request, env, ["candidate"]);
  if (path === "/api/applications" && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT a.id,a.status,a.created_at,a.updated_at,j.id job_id,j.title,j.city,j.contract_type,c.name company_name FROM applications a JOIN job_offers j ON j.id=a.job_offer_id LEFT JOIN companies c ON c.id=j.company_id WHERE a.candidate_user_id=? ORDER BY a.created_at DESC",
    )
      .bind(user.id)
      .all();
    return json({ items: results });
  }
  if (path === "/api/applications" && request.method === "POST") {
    const body = await request.json().catch(() => ({})),
      jobId = clean(body.jobId, 80),
      job = await env.DB.prepare(
        "SELECT id,recruiter_user_id,title,questionnaire_id FROM job_offers WHERE id=? AND status='published'",
      )
        .bind(jobId)
        .first();
    if (!job) return bad("Offre introuvable.", 404);
    const platform = await getPlatformSettings(env), appRules = platform.applications.rules;
    if (appRules.coverLetterRequired && !clean(body.coverLetter, 3000))
      return bad("Une lettre de motivation est obligatoire.");
    if (platform.registrations.cvRequired || appRules.cvRequired) {
      const cv = await env.DB.prepare("SELECT id FROM documents WHERE user_id=? AND kind='cv' AND deleted_at IS NULL LIMIT 1").bind(user.id).first();
      if (!cv) return bad("Ajoutez un CV avant de postuler.", 409);
    }
    if (appRules.completeProfileRequired) {
      const profile = await env.DB.prepare("SELECT professional_title,city,skills_json FROM candidate_profiles WHERE user_id=?").bind(user.id).first();
      if (!profile?.professional_title || !profile?.city || !parseStored(profile.skills_json, []).length)
        return bad("Complétez votre profil avant de postuler.", 409);
    }
    try {
      const id = crypto.randomUUID(),
        answers =
          body.questionnaireAnswers &&
          typeof body.questionnaireAnswers === "object"
            ? body.questionnaireAnswers
            : {};
      const evaluation = job.questionnaire_id
        ? await evaluateQuestionnaire(env, job.questionnaire_id, answers)
        : { score: null, unmetCriteria: [] };
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO applications(id,job_offer_id,candidate_user_id,cover_letter,questionnaire_answers_json,questionnaire_evaluation_json) VALUES(?,?,?,?,?,?)",
        ).bind(
          id,
          jobId,
          user.id,
          clean(body.coverLetter, 3000) || null,
          JSON.stringify(answers),
          JSON.stringify(evaluation),
        ),
        env.DB.prepare(
          "INSERT INTO application_status_history(id,application_id,actor_user_id,status) VALUES(?,?,?,?)",
        ).bind(crypto.randomUUID(), id, user.id, "submitted"),
        env.DB.prepare(
          "INSERT INTO notifications(id,user_id,type,title,body,href) VALUES(?,?,?,?,?,?)",
        ).bind(
          crypto.randomUUID(),
          job.recruiter_user_id,
          "application",
          "Nouvelle candidature",
          `Une candidature a été reçue pour ${job.title}`,
          "/recruteur/candidats",
        ),
      ]);
      await platformEvent(
        env,
        "APPLICATION_CREATED",
        "applications",
        user.id,
        "application",
        id,
        { jobId },
      );
      try {
        await enqueueAdminEmail(env, "new_application", "application", id, {
          delaySeconds: 5,
        });
      } catch (error) {
        console.error(JSON.stringify({ event: "admin_email_enqueue_failed", resourceType: "application", resourceId: id, error: String(error) }));
      }
      return json(
        { application: { id, status: "submitted", evaluation } },
        201,
      );
    } catch (error) {
      if (String(error).includes("UNIQUE"))
        return bad("Vous avez déjà postulé à cette offre.", 409);
      if (String(error).includes("QUESTIONNAIRE_REQUIRED"))
        return bad("Répondez aux questions obligatoires.");
      throw error;
    }
  }
  const id = path.split("/").pop();
  const application = await env.DB.prepare(
    "SELECT a.*,j.title,j.description,j.city,j.contract_type,j.work_mode,c.name company_name FROM applications a JOIN job_offers j ON j.id=a.job_offer_id LEFT JOIN companies c ON c.id=j.company_id WHERE a.id=? AND a.candidate_user_id=?",
  )
    .bind(id, user.id)
    .first();
  if (!application) return bad("Candidature introuvable.", 404);
  if (request.method === "GET") {
    const platform = await getPlatformSettings(env);
    const { results = [] } = await env.DB.prepare(
      "SELECT status,created_at FROM application_status_history WHERE application_id=? ORDER BY created_at",
    )
      .bind(id)
      .all();
    return json({ application, timeline: results });
  }
  if (request.method === "PATCH") {
    const platform = await getPlatformSettings(env);
    if (!platform.applications.withdrawalEnabled)
      return bad("Le retrait des candidatures est désactivé.", 403);
    if (application.status === "accepted" || application.status === "rejected")
      return bad("Cette candidature ne peut plus être retirée.");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE applications SET status='withdrawn',updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(id),
      env.DB.prepare(
        "INSERT INTO application_status_history(id,application_id,actor_user_id,status) VALUES(?,?,?,'withdrawn')",
      ).bind(crypto.randomUUID(), id, user.id),
    ]);
    return json({ ok: true });
  }
  return bad("Action non prise en charge.", 405);
}
async function interviews(request, env, path) {
  const user = await requireUser(request, env, ["candidate"]);
  if (path === "/api/interviews" && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT i.*,j.title,c.name company_name FROM interviews i JOIN applications a ON a.id=i.application_id JOIN job_offers j ON j.id=a.job_offer_id LEFT JOIN companies c ON c.id=j.company_id WHERE i.candidate_user_id=? ORDER BY i.starts_at",
    )
      .bind(user.id)
      .all();
    return json({ items: results });
  }
  if (request.method === "PATCH") {
    const body = await request.json().catch(() => ({})),
      status = ["confirmed", "declined", "reschedule_requested"].includes(
        body.status,
      )
        ? body.status
        : null;
    if (!status) return bad("Statut invalide.");
    await env.DB.prepare(
      "UPDATE interviews SET status=?,candidate_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND candidate_user_id=?",
    )
      .bind(
        status,
        clean(body.note, 500) || null,
        path.split("/").pop(),
        user.id,
      )
      .run();
    return json({ ok: true });
  }
  return bad("Action non prise en charge.", 405);
}
async function settings(request, env) {
  const user = await requireUser(request, env, ["candidate"]);
  if (request.method === "GET") {
    const prefs = await env.DB.prepare(
      "SELECT * FROM notification_preferences WHERE user_id=?",
    )
      .bind(user.id)
      .first();
    const profileRow = await env.DB.prepare(
      "SELECT profile_visible,preferred_language FROM candidate_profiles WHERE user_id=?",
    )
      .bind(user.id)
      .first();
    return json({
      settings: {
        inAppEnabled: prefs?.in_app_enabled ?? 1,
        emailEnabled: prefs?.email_enabled ?? 1,
        jobAlertsEnabled: prefs?.job_alerts_enabled ?? 1,
        profileViewEnabled: prefs?.profile_view_enabled ?? 0,
        profileVisible: profileRow.profile_visible,
        language: profileRow.preferred_language,
      },
    });
  }
  const body = await request.json().catch(() => ({}));
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO notification_preferences(user_id,in_app_enabled,email_enabled,job_alerts_enabled,profile_view_enabled) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET in_app_enabled=excluded.in_app_enabled,email_enabled=excluded.email_enabled,job_alerts_enabled=excluded.job_alerts_enabled,profile_view_enabled=excluded.profile_view_enabled,updated_at=CURRENT_TIMESTAMP",
    ).bind(
      user.id,
      body.inAppEnabled ? 1 : 0,
      body.emailEnabled ? 1 : 0,
      body.jobAlertsEnabled ? 1 : 0,
      body.profileViewEnabled ? 1 : 0,
    ),
    env.DB.prepare(
      "UPDATE candidate_profiles SET profile_visible=?,preferred_language=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
    ).bind(
      body.profileVisible ? 1 : 0,
      ["fr", "en", "ar"].includes(body.language) ? body.language : "fr",
      user.id,
    ),
  ]);
  return json({ ok: true });
}
async function security(request, env) {
  const user = await requireUser(request, env);
  const body = await request.json().catch(() => ({}));
  if (
    !validPassword(body.newPassword) ||
    body.newPassword !== body.confirmPassword
  )
    return bad("Le nouveau mot de passe est invalide ou ne correspond pas.");
  const current = await env.DB.prepare(
    "SELECT password_hash,password_salt FROM users WHERE id=?",
  )
    .bind(user.id)
    .first();
  if (
    (await hashPassword(body.currentPassword, current.password_salt)) !==
    current.password_hash
  )
    return bad("Le mot de passe actuel est incorrect.", 401);
  const salt = token(),
    hash = await hashPassword(body.newPassword, salt);
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE users SET password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(hash, salt, user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND id<>?").bind(
      user.id,
      user.session_id,
    ),
  ]);
  return json({ ok: true });
}
async function overview(request, env) {
  const user = await requireUser(request, env, ["candidate"]);
  const [
    profileRow,
    stats,
    notificationsResult,
    applicationsResult,
    interviewsResult,
    jobsResult,
  ] = await Promise.all([
    profile(env, user),
    candidateStats(request, env).then((r) => r.json()),
    notifications(request, env, "/api/notifications").then((r) => r.json()),
    applications(request, env, "/api/applications").then((r) => r.json()),
    interviews(request, env, "/api/interviews").then((r) => r.json()),
    jobs(request, env, "/api/jobs").then((r) => r.json()),
  ]);
  return json({
    profile: profileRow,
    stats,
    notifications: notificationsResult.items.slice(0, 5),
    applications: applicationsResult.items.slice(0, 5),
    interviews: interviewsResult.items
      .filter((i) => new Date(i.starts_at) > new Date())
      .slice(0, 3),
    recommendedJobs: jobsResult.items.slice(0, 4),
    matchingScore: null,
  });
}
async function publicStats(env) {
  const row = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM users WHERE role='candidate') candidates,(SELECT COUNT(*) FROM companies) companies,(SELECT COUNT(*) FROM job_offers WHERE status='published') jobs,(SELECT COUNT(*) FROM applications) applications",
  ).first();
  return json({ stats: row || {} });
}
async function questionnaire(env) {
  const { results = [] } = await env.DB.prepare(
    "SELECT id,field_key,type,labels_json,description_json,options_json,sort_order,is_required FROM questionnaire_questions WHERE is_active=1 ORDER BY sort_order",
  ).all();
  return json(
    results.map((q) => ({
      ...q,
      labels: JSON.parse(q.labels_json),
      options: q.options_json ? JSON.parse(q.options_json) : [],
    })),
  );
}
async function recruiterJobs(request, env) {
  const user = await requireUser(request, env, ["recruiter"]);
  const { results = [] } = await env.DB.prepare(
    "SELECT j.*,c.name company_name FROM job_offers j LEFT JOIN companies c ON c.id=j.company_id WHERE j.recruiter_user_id=? ORDER BY j.created_at DESC",
  )
    .bind(user.id)
    .all();
  return json({ items: results });
}
const jobStatuses = ["draft", "published", "closed", "archived"];
const applicationStatuses = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "accepted",
  "rejected",
];
async function recruiterOverview(request, env) {
  const user = await requireUser(request, env, ["recruiter"]);
  const stats = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM job_offers WHERE recruiter_user_id=? AND status='published') active_jobs,(SELECT COUNT(*) FROM applications a JOIN job_offers j ON j.id=a.job_offer_id WHERE j.recruiter_user_id=? AND a.status='submitted') new_applications,(SELECT COUNT(*) FROM applications a JOIN job_offers j ON j.id=a.job_offer_id WHERE j.recruiter_user_id=? AND a.status='shortlisted') shortlisted,(SELECT COUNT(*) FROM interviews WHERE recruiter_user_id=? AND starts_at>CURRENT_TIMESTAMP AND status NOT IN ('cancelled','declined')) interviews",
  )
    .bind(user.id, user.id, user.id, user.id)
    .first();
  const { results: recent = [] } = await env.DB.prepare(
    "SELECT a.id,a.status,a.created_at,j.title,cp.first_name,cp.last_name,cp.professional_title,cp.city FROM applications a JOIN job_offers j ON j.id=a.job_offer_id JOIN candidate_profiles cp ON cp.user_id=a.candidate_user_id WHERE j.recruiter_user_id=? ORDER BY a.created_at DESC LIMIT 6",
  )
    .bind(user.id)
    .all();
  const { results: performance = [] } = await env.DB.prepare(
    "SELECT j.id,j.title,j.status,j.published_at,COUNT(a.id) applications,SUM(CASE WHEN a.status='shortlisted' THEN 1 ELSE 0 END) shortlisted,SUM(CASE WHEN a.status='accepted' THEN 1 ELSE 0 END) accepted FROM job_offers j LEFT JOIN applications a ON a.job_offer_id=j.id WHERE j.recruiter_user_id=? GROUP BY j.id ORDER BY applications DESC,j.created_at DESC LIMIT 6",
  )
    .bind(user.id)
    .all();
  return json({
    stats: {
      activeJobs: stats.active_jobs || 0,
      newApplications: stats.new_applications || 0,
      shortlisted: stats.shortlisted || 0,
      interviews: stats.interviews || 0,
    },
    recentApplications: recent,
    performance,
    recommendedCandidates: [],
  });
}
async function recruiterOffer(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]),
    parts = path.split("/"),
    id = parts[4],
    action = parts[5];
  if (path === "/api/recruiter/jobs" && request.method === "GET")
    return recruiterJobs(request, env);
  if (path === "/api/recruiter/jobs" && request.method === "POST")
    return saveRecruiterOffer(request, env, user);
  const job = await env.DB.prepare(
    "SELECT j.*,c.name company_name,(SELECT COUNT(*) FROM applications a WHERE a.job_offer_id=j.id) applications FROM job_offers j LEFT JOIN companies c ON c.id=j.company_id WHERE j.id=? AND j.recruiter_user_id=?",
  )
    .bind(id, user.id)
    .first();
  if (!job) return bad("Offre introuvable.", 404);
  if (request.method === "GET") return json({ job });
  if (action === "duplicate" && request.method === "POST") {
    const newId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO job_offers(id,recruiter_user_id,company_id,title,domain,description,missions,responsibilities,required_skills,contract_type,city,country,work_mode,experience_level,education_level,salary_min,salary_max,deadline_at,openings_count,status,benefits,conditions_json,questionnaire_id) SELECT ?,recruiter_user_id,company_id,title||' - Copie',domain,description,missions,responsibilities,required_skills,contract_type,city,country,work_mode,experience_level,education_level,salary_min,salary_max,deadline_at,openings_count,'draft',benefits,conditions_json,questionnaire_id FROM job_offers WHERE id=?",
    )
      .bind(newId, id)
      .run();
    await audit(env, user, "job_duplicated", "job_offer", newId, {
      sourceId: id,
    });
    return json({ job: { id: newId, status: "draft" } }, 201);
  }
  if (action === "publish" && request.method === "POST") {
    const platform = await getPlatformSettings(env);
    const values = { title:job.title, domain:job.domain, description:job.description, contractType:job.contract_type, city:job.city, workMode:job.work_mode, skills:parseStored(job.required_skills,[]), experienceLevel:job.experience_level, educationLevel:job.education_level, salary:job.salary_min || job.salary_max };
    if (platform.jobs.requiredFields.some((field) => !values[field] || (Array.isArray(values[field]) && !values[field].length)))
      return bad("Complétez les champs obligatoires avant publication.");
    if (!platform.jobs.contractTypes.includes(job.contract_type)) return bad("Type de contrat non autorisé.");
    await env.DB.prepare(
      "UPDATE job_offers SET status='published',published_at=COALESCE(published_at,CURRENT_TIMESTAMP),deadline_at=COALESCE(deadline_at,datetime('now',?)),updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(`+${platform.jobs.publicationDays} days`, id)
      .run();
    await audit(env, user, "job_published", "job_offer", id);
    return json({ ok: true });
  }
  if (request.method === "PATCH")
    return saveRecruiterOffer(request, env, user, id);
  if (request.method === "DELETE") {
    await env.DB.prepare(
      "UPDATE job_offers SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(id)
      .run();
    return new Response(null, { status: 204 });
  }
  return bad("Action non prise en charge.", 405);
}
async function saveRecruiterOffer(request, env, user, id = null) {
  const body = await request.json().catch(() => null);
  if (!body) return bad("Données invalides.");
  const title = clean(body.title, 160),
    domain = clean(body.domain, 120),
    description = clean(body.description, 5000),
    contract = clean(body.contractType, 80),
    city = clean(body.city, 120),
    mode = clean(body.workMode, 40),
    status = jobStatuses.includes(body.status) ? body.status : "draft";
  const platform = await getPlatformSettings(env), fields = { title, domain, description, contractType: contract, city, workMode: mode, skills: list(body.skills), experienceLevel: clean(body.experienceLevel, 80), educationLevel: clean(body.educationLevel, 80), salary: body.salaryMin || body.salaryMax };
  if (status === "published" && platform.jobs.requiredFields.some((field) => !fields[field] || (Array.isArray(fields[field]) && !fields[field].length)))
    return bad("Complétez les champs obligatoires avant publication.");
  if (contract && !platform.jobs.contractTypes.includes(contract)) return bad("Type de contrat non autorisé.");
  let company = await env.DB.prepare(
    "SELECT id FROM companies WHERE owner_user_id=?",
  )
    .bind(user.id)
    .first();
  if (!company) {
    company = { id: crypto.randomUUID() };
    await env.DB.prepare(
      "INSERT INTO companies(id,owner_user_id,name,sector,city) VALUES(?,?,?,?,?)",
    )
      .bind(
        company.id,
        user.id,
        clean(body.companyName, 160) || "Entreprise",
        domain || null,
        city || null,
      )
      .run();
  }
  const values = [
    title || "Brouillon sans titre",
    domain || "Non défini",
    description || "À compléter",
    clean(body.missions, 5000) || null,
    clean(body.responsibilities, 5000) || null,
    JSON.stringify(list(body.skills)),
    contract || "À définir",
    city || "À définir",
    clean(body.country, 120) || "Maroc",
    mode || "onsite",
    clean(body.experienceLevel, 80) || null,
    clean(body.educationLevel, 80) || null,
    Number.isFinite(Number(body.salaryMin)) ? Number(body.salaryMin) : null,
    Number.isFinite(Number(body.salaryMax)) ? Number(body.salaryMax) : null,
    clean(body.deadlineAt, 40) || null,
    Number.isInteger(Number(body.openingsCount))
      ? Number(body.openingsCount)
      : 1,
    status,
    clean(body.benefits, 5000) || null,
    JSON.stringify(
      body.conditions && typeof body.conditions === "object"
        ? body.conditions
        : {},
    ),
    clean(body.questionnaireId, 80) || null,
  ];
  if (id) {
    await env.DB.prepare(
      "UPDATE job_offers SET title=?,domain=?,description=?,missions=?,responsibilities=?,required_skills=?,contract_type=?,city=?,country=?,work_mode=?,experience_level=?,education_level=?,salary_min=?,salary_max=?,deadline_at=?,openings_count=?,status=?,benefits=?,conditions_json=?,questionnaire_id=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE published_at END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND recruiter_user_id=?",
    )
      .bind(...values, status, id, user.id)
      .run();
    await audit(env, user, "job_updated", "job_offer", id, { status });
    if (status === "published") {
      await platformEvent(env, "JOB_PUBLISHED", "jobs", user.id, "job_offer", id);
      try {
        await enqueueAdminEmail(env, "new_job", "job_offer", id, { delaySeconds: 5 });
      } catch (error) {
        console.error(JSON.stringify({ event: "admin_email_enqueue_failed", resourceType: "job_offer", resourceId: id, error: String(error) }));
      }
    }
    return json({ job: { id, status } });
  }
  id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO job_offers(id,recruiter_user_id,company_id,title,domain,description,missions,responsibilities,required_skills,contract_type,city,country,work_mode,experience_level,education_level,salary_min,salary_max,deadline_at,openings_count,status,benefits,conditions_json,questionnaire_id,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      user.id,
      company.id,
      ...values,
      status === "published" ? now() : null,
    )
    .run();
  await audit(env, user, "job_created", "job_offer", id, { status });
  if (status === "published") {
    await platformEvent(env, "JOB_PUBLISHED", "jobs", user.id, "job_offer", id);
    try {
      await enqueueAdminEmail(env, "new_job", "job_offer", id, { delaySeconds: 5 });
    } catch (error) {
      console.error(JSON.stringify({ event: "admin_email_enqueue_failed", resourceType: "job_offer", resourceId: id, error: String(error) }));
    }
  }
  return json({ job: { id, status } }, 201);
}
async function recruiterQuestionnaires(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]);
  if (path === "/api/recruiter/questionnaires" && request.method === "GET") {
    const [owned, templates] = await Promise.all([
      env.DB.prepare(
        "SELECT q.*,COUNT(qq.id) question_count,(SELECT COUNT(*) FROM job_offers j WHERE j.questionnaire_id=q.id) usage_count FROM recruiter_questionnaires q LEFT JOIN recruiter_questions qq ON qq.questionnaire_id=q.id WHERE q.recruiter_user_id=? GROUP BY q.id ORDER BY q.updated_at DESC",
      )
        .bind(user.id)
        .all(),
      env.DB.prepare(
        "SELECT t.id,t.name,t.description,t.template_kind,(SELECT COUNT(*) FROM admin_template_questions q WHERE q.template_id=t.id) question_count FROM admin_questionnaire_templates t WHERE t.status='active' AND t.is_recruiter_available=1 ORDER BY t.name",
      ).all(),
    ]);
    return json({
      items: owned.results || [],
      templates: templates.results || [],
    });
  }
  if (path === "/api/recruiter/questionnaires" && request.method === "POST") {
    const body = await request.json().catch(() => ({})),
      name = clean(body.name, 160);
    if (clean(body.templateId, 80)) {
      const template = await adminTemplateSnapshot(
        env,
        clean(body.templateId, 80),
      );
      if (
        !template ||
        template.template.status !== "active" ||
        !template.template.is_recruiter_available
      )
        return bad("Modèle indisponible.", 404);
      const id = crypto.randomUUID(),
        map = new Map(
          template.questions.map((q) => [q.id, crypto.randomUUID()]),
        );
      const statements = [
        env.DB.prepare(
          "INSERT INTO recruiter_questionnaires(id,recruiter_user_id,name,description,status,source_template_id) VALUES(?,?,?,?, 'draft',?)",
        ).bind(
          id,
          user.id,
          name || template.template.name,
          template.template.description,
          template.template.id,
        ),
      ];
      for (const q of template.questions) {
        const condition = parseStored(q.condition_json, {});
        if (condition.questionId && map.has(condition.questionId))
          condition.questionId = map.get(condition.questionId);
        statements.push(
          env.DB.prepare(
            "INSERT INTO recruiter_questions(id,questionnaire_id,label_json,help_json,question_type,options_json,is_required,weight,is_eliminatory,condition_json,sort_order,description_json,placeholder_json,validation_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          ).bind(
            map.get(q.id),
            id,
            q.label_json,
            q.help_json,
            q.question_type,
            q.options_json,
            q.is_required,
            q.weight,
            q.is_eliminatory,
            JSON.stringify(condition),
            q.sort_order,
            q.description_json,
            q.placeholder_json,
            q.validation_json,
          ),
        );
      }
      await env.DB.batch(statements);
      await audit(
        env,
        user,
        "questionnaire_created_from_template",
        "recruiter_questionnaire",
        id,
        { templateId: template.template.id },
      );
      return json({ questionnaire: { id } }, 201);
    }
    if (!name) return bad("Le nom du questionnaire est obligatoire.");
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO recruiter_questionnaires(id,recruiter_user_id,name,description,status) VALUES(?,?,?,?,?)",
    )
      .bind(
        id,
        user.id,
        name,
        clean(body.description, 1000) || null,
        body.status === "active" ? "active" : "draft",
      )
      .run();
    return json({ questionnaire: { id } }, 201);
  }
  const id = path.split("/")[4],
    questionnaire = await env.DB.prepare(
      "SELECT * FROM recruiter_questionnaires WHERE id=? AND recruiter_user_id=?",
    )
      .bind(id, user.id)
      .first();
  if (!questionnaire) return bad("Questionnaire introuvable.", 404);
  if (request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT * FROM recruiter_questions WHERE questionnaire_id=? ORDER BY sort_order,created_at",
    )
      .bind(id)
      .all();
    return json({ questionnaire, questions: results });
  }
  if (request.method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    await env.DB.prepare(
      "UPDATE recruiter_questionnaires SET name=COALESCE(?,name),description=COALESCE(?,description),status=COALESCE(?,status),updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        clean(body.name, 160) || null,
        clean(body.description, 1000) || null,
        ["draft", "active", "archived"].includes(body.status)
          ? body.status
          : null,
        id,
      )
      .run();
    return json({ ok: true });
  }
  if (request.method === "DELETE") {
    await env.DB.prepare(
      "UPDATE recruiter_questionnaires SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(id)
      .run();
    return new Response(null, { status: 204 });
  }
  return bad("Action non prise en charge.", 405);
}
async function recruiterQuestions(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]),
    parts = path.split("/"),
    questionnaireId = parts[4],
    questionId = parts[6],
    owner = await env.DB.prepare(
      "SELECT id FROM recruiter_questionnaires WHERE id=? AND recruiter_user_id=?",
    )
      .bind(questionnaireId, user.id)
      .first();
  if (!owner) return bad("Questionnaire introuvable.", 404);
  const body = await request.json().catch(() => ({}));
  if (!questionId && request.method === "POST") {
    const type = [
        "short_text",
        "long_text",
        "number",
        "boolean",
        "single_choice",
        "multiple_choice",
        "date",
        "rating",
        "upload",
      ].includes(body.type)
        ? body.type
        : null,
      label = clean(body.label, 500);
    if (!type || !label) return bad("Question invalide.");
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO recruiter_questions(id,questionnaire_id,label_json,help_json,question_type,options_json,is_required,weight,is_eliminatory,condition_json,sort_order,description_json,placeholder_json,validation_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        questionnaireId,
        JSON.stringify({
          fr: label,
          en: clean(body.labelEn, 500) || label,
          ar: clean(body.labelAr, 500) || label,
        }),
        JSON.stringify({
          fr: clean(body.help, 500),
          en: clean(body.helpEn, 500),
          ar: clean(body.helpAr, 500),
        }),
        type,
        JSON.stringify(list(body.options)),
        body.required ? 1 : 0,
        Math.min(100, Math.max(0, Number(body.weight) || 0)),
        body.eliminatory ? 1 : 0,
        JSON.stringify(body.condition || {}),
        Number(body.sortOrder) || 0,
        JSON.stringify(multilingual(body.description, 1000) || {}),
        JSON.stringify(multilingual(body.placeholder, 300) || {}),
        JSON.stringify(
          body.validation && typeof body.validation === "object"
            ? body.validation
            : {},
        ),
      )
      .run();
    return json({ question: { id } }, 201);
  }
  if (questionId && request.method === "DELETE") {
    await env.DB.prepare(
      "DELETE FROM recruiter_questions WHERE id=? AND questionnaire_id=?",
    )
      .bind(questionId, questionnaireId)
      .run();
    return new Response(null, { status: 204 });
  }
  return bad("Action non prise en charge.", 405);
}
function matching(job, candidate, settings) {
  if (!settings?.enabled) return { score: null, breakdown: [], recommended: false };
  const jobSkills = parseStored(job.required_skills, []).map((x) =>
      String(x).toLowerCase(),
    ),
    skills = parseStored(candidate.skills_json, []).map((x) =>
      String(x).toLowerCase(),
    ),
    breakdown = [],
    push = (key, score) => breakdown.push({ key, score, weight: Number(settings.weights?.[key] || 0) });
  if (jobSkills.length && skills.length) {
    const hits = jobSkills.filter((x) =>
      skills.some((y) => y.includes(x) || x.includes(y)),
    ).length;
    push("skills", Math.round((hits / jobSkills.length) * 100));
  }
  const jobCity = job.job_city || job.city;
  const candidateCity = candidate.candidate_city || candidate.city;
  if (jobCity && candidateCity)
    push(
      "location",
      jobCity.toLowerCase() === candidateCity.toLowerCase() ? 100 : 0,
    );
  if (job.experience_level && parseStored(candidate.experience_json, []).length)
    push("experience", 70);
  if (job.education_level && parseStored(candidate.education_json, []).length)
    push("education", 70);
  if (job.contract_type && parseStored(candidate.preferences_json, {}).contract)
    push("contract", job.contract_type === parseStored(candidate.preferences_json, {}).contract ? 100 : 0);
  if (candidate.availability) push("availability", 100);
  const evaluation = parseStored(candidate.questionnaire_evaluation_json, {});
  if (Number.isFinite(evaluation.score)) push("questionnaire", evaluation.score);
  if (breakdown.length < 2) return { score: null, breakdown: [] };
  const total = breakdown.reduce((sum, x) => sum + x.weight, 0),
    score = Math.round(
      breakdown.reduce((sum, x) => sum + x.score * x.weight, 0) / total,
    );
  return { score, breakdown, recommended: score >= settings.recommendedThreshold };
}
async function recruiterApplications(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]),
    platform = await getPlatformSettings(env);
  if (path === "/api/recruiter/applications" && request.method === "GET") {
    const url = new URL(request.url),
      jobId = clean(url.searchParams.get("jobId"), 80);
    let sql =
        "SELECT a.id,a.status,a.created_at,a.updated_at,a.job_offer_id,j.title,cp.first_name,cp.last_name,cp.professional_title,cp.city,cp.availability FROM applications a JOIN job_offers j ON j.id=a.job_offer_id JOIN candidate_profiles cp ON cp.user_id=a.candidate_user_id WHERE j.recruiter_user_id=?",
      params = [user.id];
    if (jobId) {
      sql += " AND j.id=?";
      params.push(jobId);
    }
    const { results = [] } = await env.DB.prepare(
      sql + " ORDER BY a.created_at DESC",
    )
      .bind(...params)
      .all();
    return json({ items: results });
  }
  const id = path.split("/")[4],
    application = await env.DB.prepare(
      "SELECT a.*,j.*,a.id application_id,a.status application_status,j.id job_id,j.city job_city,cp.*,cp.city candidate_city,u.email candidate_email,c.name company_name FROM applications a JOIN job_offers j ON j.id=a.job_offer_id JOIN candidate_profiles cp ON cp.user_id=a.candidate_user_id JOIN users u ON u.id=a.candidate_user_id LEFT JOIN companies c ON c.id=j.company_id WHERE a.id=? AND j.recruiter_user_id=?",
    )
      .bind(id, user.id)
      .first();
  if (!application) return bad("Candidature introuvable.", 404);
  application.status = application.application_status;
  application.city = application.candidate_city;
  if (request.method === "GET") {
    const [
      { results: history = [] },
      { results: notes = [] },
      { results: documents = [] },
      { results: questions = [] },
    ] = await Promise.all([
      env.DB.prepare(
        "SELECT status,created_at FROM application_status_history WHERE application_id=? ORDER BY created_at",
      )
        .bind(id)
        .all(),
      env.DB.prepare(
        "SELECT n.id,n.content,n.created_at,rp.first_name,rp.last_name FROM application_internal_notes n JOIN recruiter_profiles rp ON rp.user_id=n.author_user_id WHERE n.application_id=? ORDER BY n.created_at DESC",
      )
        .bind(id)
        .all(),
      env.DB.prepare(
        "SELECT id,kind,original_name,size_bytes,is_default,created_at FROM documents WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC",
      )
        .bind(application.candidate_user_id)
        .all(),
      application.questionnaire_id
        ? env.DB.prepare(
            "SELECT id,label_json,description_json,help_json,placeholder_json,question_type,options_json,is_required,weight,is_eliminatory,validation_json,condition_json,sort_order FROM recruiter_questions WHERE questionnaire_id=? ORDER BY sort_order,created_at",
          )
            .bind(application.questionnaire_id)
            .all()
        : Promise.resolve({ results: [] }),
    ]);
    return json({
      application,
      history,
      notes,
      documents,
      questionnaire: {
        questions: questions.map(parsedQuestion),
        answers: parseStored(application.questionnaire_answers_json, {}),
        evaluation: parseStored(application.questionnaire_evaluation_json, {
          score: null,
          unmetCriteria: [],
        }),
      },
      matching: matching(application, application, platform.matching),
    });
  }
  if (request.method === "PATCH") {
    const body = await request.json().catch(() => ({})),
      status = applicationStatuses.includes(body.status) && platform.applications.statuses.includes(body.status) ? body.status : null;
    if (!status) return bad("Statut invalide.");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE applications SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(status, id),
      env.DB.prepare(
        "INSERT INTO application_status_history(id,application_id,actor_user_id,status) VALUES(?,?,?,?)",
      ).bind(crypto.randomUUID(), id, user.id, status),
      env.DB.prepare(
        "INSERT INTO notifications(id,user_id,type,title,body,href) VALUES(?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        application.candidate_user_id,
        "application",
        "Mise à jour de candidature",
        `Votre candidature pour ${application.title} a été mise à jour.`,
        "/demandeur/candidatures",
      ),
    ]);
    await audit(env, user, "application_status_changed", "application", id, {
      status,
    });
    return json({ ok: true });
  }
  return bad("Action non prise en charge.", 405);
}
async function recruiterNotes(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]),
    applicationId = path.split("/")[4],
    owned = await env.DB.prepare(
      "SELECT a.id FROM applications a JOIN job_offers j ON j.id=a.job_offer_id WHERE a.id=? AND j.recruiter_user_id=?",
    )
      .bind(applicationId, user.id)
      .first();
  if (!owned) return bad("Candidature introuvable.", 404);
  const body = await request.json().catch(() => ({})),
    content = clean(body.content, 2000);
  if (!content) return bad("La note est vide.");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO application_internal_notes(id,application_id,author_user_id,content) VALUES(?,?,?,?)",
  )
    .bind(id, applicationId, user.id, content)
    .run();
  await audit(env, user, "internal_note_created", "application", applicationId);
  return json({ note: { id } }, 201);
}
async function recruiterCandidates(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]);
  if (path === "/api/recruiter/candidates") {
    const url = new URL(request.url),
      q = clean(url.searchParams.get("q"), 100),
      city = clean(url.searchParams.get("city"), 100);
    let sql =
        "SELECT cp.user_id,cp.first_name,cp.last_name,cp.professional_title,cp.city,cp.availability,cp.skills_json,cp.experience_json,cp.education_json,cp.languages_json FROM candidate_profiles cp WHERE cp.profile_visible=1",
      params = [];
    if (q) {
      sql +=
        " AND (cp.first_name LIKE ? OR cp.last_name LIKE ? OR cp.professional_title LIKE ? OR cp.skills_json LIKE ?)";
      params.push(...Array(4).fill(`%${q}%`));
    }
    if (city) {
      sql += " AND cp.city LIKE ?";
      params.push(`%${city}%`);
    }
    const { results = [] } = await env.DB.prepare(
      sql + " ORDER BY cp.updated_at DESC LIMIT 50",
    )
      .bind(...params)
      .all();
    return json({ items: results, matchingScore: null });
  }
  const candidateId = path.split("/").pop(),
    candidate = await env.DB.prepare(
      "SELECT cp.*,u.email FROM candidate_profiles cp JOIN users u ON u.id=cp.user_id WHERE cp.user_id=? AND (cp.profile_visible=1 OR EXISTS(SELECT 1 FROM applications a JOIN job_offers j ON j.id=a.job_offer_id WHERE a.candidate_user_id=cp.user_id AND j.recruiter_user_id=?))",
    )
      .bind(candidateId, user.id)
      .first();
  if (!candidate) return bad("Candidat introuvable.", 404);
  await env.DB.prepare(
    "INSERT INTO profile_views(id,profile_owner_id,viewer_user_id,viewer_role,source) VALUES(?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      candidateId,
      user.id,
      "recruiter",
      "candidate_search",
    )
    .run();
  const { results: documents = [] } = await env.DB.prepare(
    "SELECT id,kind,original_name,size_bytes,is_default,created_at FROM documents WHERE user_id=? AND deleted_at IS NULL",
  )
    .bind(candidateId)
    .all();
  return json({
    candidate,
    documents,
    matching: { score: null, breakdown: [] },
  });
}
async function recruiterDocument(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]),
    id = path.split("/")[4],
    doc = await env.DB.prepare(
      "SELECT d.* FROM documents d WHERE d.id=? AND d.deleted_at IS NULL AND EXISTS(SELECT 1 FROM applications a JOIN job_offers j ON j.id=a.job_offer_id WHERE a.candidate_user_id=d.user_id AND j.recruiter_user_id=?)",
    )
      .bind(id, user.id)
      .first();
  if (!doc) return bad("Document introuvable.", 404);
  const body = await loadDocument(env, doc.id, doc.storage_key);
  if (!body) return bad("Fichier introuvable.", 404);
  return new Response(body, {
    headers: {
      "content-type": doc.content_type,
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`,
    },
  });
}
async function recruiterInterviews(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]);
  if (path === "/api/recruiter/interviews" && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT i.*,j.title,cp.first_name,cp.last_name,c.name company_name FROM interviews i JOIN applications a ON a.id=i.application_id JOIN job_offers j ON j.id=a.job_offer_id JOIN candidate_profiles cp ON cp.user_id=i.candidate_user_id LEFT JOIN companies c ON c.id=j.company_id WHERE i.recruiter_user_id=? ORDER BY i.starts_at",
    )
      .bind(user.id)
      .all();
    return json({ items: results });
  }
  if (path === "/api/recruiter/interviews" && request.method === "POST") {
    const body = await request.json().catch(() => ({})),
      platform = await getPlatformSettings(env),
      application = await env.DB.prepare(
        "SELECT a.id,a.candidate_user_id,j.title FROM applications a JOIN job_offers j ON j.id=a.job_offer_id WHERE a.id=? AND j.recruiter_user_id=?",
      )
        .bind(clean(body.applicationId, 80), user.id)
        .first();
    if (
      !application ||
      !clean(body.startsAt, 50) ||
      !platform.interviews.types.includes(body.type)
    )
      return bad("Informations d’entretien invalides.");
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO interviews(id,application_id,candidate_user_id,recruiter_user_id,starts_at,duration_minutes,interview_type,location,meeting_url,status) VALUES(?,?,?,?,?,?,?,?,?,'scheduled')",
      ).bind(
        id,
        application.id,
        application.candidate_user_id,
        user.id,
        body.startsAt,
        Number(body.duration) || platform.interviews.defaultDurations[body.type],
        body.type,
        clean(body.location, 500) || null,
        clean(body.meetingUrl, 500) || null,
      ),
      env.DB.prepare(
        "UPDATE applications SET status='interview',updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(application.id),
      env.DB.prepare(
        "INSERT INTO application_status_history(id,application_id,actor_user_id,status) VALUES(?,?,?,'interview')",
      ).bind(crypto.randomUUID(), application.id, user.id),
      env.DB.prepare(
        "INSERT INTO notifications(id,user_id,type,title,body,href) VALUES(?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        application.candidate_user_id,
        "interview",
        "Nouvel entretien",
        `Un entretien a été planifié pour ${application.title}.`,
        "/demandeur/entretiens",
      ),
    ]);
    await platformEvent(
      env,
      "INTERVIEW_CREATED",
      "interviews",
      user.id,
      "interview",
      id,
      { applicationId: application.id },
    );
    return json({ interview: { id } }, 201);
  }
  const id = path.split("/").pop(),
    body = await request.json().catch(() => ({})),
    status = ["scheduled", "confirmed", "cancelled", "completed"].includes(
      body.status,
    )
      ? body.status
      : null;
  if (request.method === "PATCH") {
    const platform = await getPlatformSettings(env);
    if (body.type && !platform.interviews.types.includes(body.type)) return bad("Type d’entretien désactivé.");
    await env.DB.prepare(
      "UPDATE interviews SET starts_at=COALESCE(?,starts_at),duration_minutes=COALESCE(?,duration_minutes),interview_type=COALESCE(?,interview_type),location=COALESCE(?,location),meeting_url=COALESCE(?,meeting_url),status=COALESCE(?,status),updated_at=CURRENT_TIMESTAMP WHERE id=? AND recruiter_user_id=?",
    )
      .bind(
        clean(body.startsAt, 50) || null,
        Number(body.duration) || null,
        platform.interviews.types.includes(body.type) ? body.type : null,
        clean(body.location, 500) || null,
        clean(body.meetingUrl, 500) || null,
        status,
        id,
        user.id,
      )
      .run();
    return json({ ok: true });
  }
  return bad("Action non prise en charge.", 405);
}
async function recruiterCompany(request, env) {
  const user = await requireUser(request, env, ["recruiter"]);
  let company = await env.DB.prepare(
    "SELECT c.*,rp.first_name,rp.last_name,rp.phone,rp.job_title FROM recruiter_profiles rp LEFT JOIN companies c ON c.owner_user_id=rp.user_id WHERE rp.user_id=?",
  )
    .bind(user.id)
    .first();
  if (request.method === "GET") return json({ company });
  const body = await request.json().catch(() => ({})),
    name = clean(body.name, 160);
  if (!name) return bad("Le nom de l’entreprise est obligatoire.");
  const existing = await env.DB.prepare(
    "SELECT id FROM companies WHERE owner_user_id=?",
  )
    .bind(user.id)
    .first();
  if (existing)
    await env.DB.prepare(
      "UPDATE companies SET name=?,sector=?,company_size=?,city=?,website=?,description=?,logo_url=?,updated_at=CURRENT_TIMESTAMP WHERE owner_user_id=?",
    )
      .bind(
        name,
        clean(body.sector, 120) || null,
        clean(body.companySize, 80) || null,
        clean(body.city, 120) || null,
        clean(body.website, 240) || null,
        clean(body.description, 2000) || null,
        clean(body.logoUrl, 500) || null,
        user.id,
      )
      .run();
  else
    await env.DB.prepare(
      "INSERT INTO companies(id,owner_user_id,name,sector,company_size,city,website,description,logo_url) VALUES(?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        crypto.randomUUID(),
        user.id,
        name,
        clean(body.sector, 120) || null,
        clean(body.companySize, 80) || null,
        clean(body.city, 120) || null,
        clean(body.website, 240) || null,
        clean(body.description, 2000) || null,
        clean(body.logoUrl, 500) || null,
      )
      .run();
  await env.DB.prepare(
    "UPDATE recruiter_profiles SET company_name=?,company_sector=?,company_size=?,city=?,website=?,job_title=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
  )
    .bind(
      name,
      clean(body.sector, 120) || null,
      clean(body.companySize, 80) || null,
      clean(body.city, 120) || null,
      clean(body.website, 240) || null,
      clean(body.jobTitle, 120) || null,
      user.id,
    )
    .run();
  return json({ ok: true });
}
async function recruiterSettings(request, env) {
  const user = await requireUser(request, env, ["recruiter"]);
  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT * FROM recruiter_preferences WHERE user_id=?",
    )
      .bind(user.id)
      .first();
    return json({
      settings: {
        language: row?.preferred_language || "fr",
        emailEnabled: row?.email_enabled ?? 1,
        applicationAlerts: row?.application_alerts ?? 1,
        interviewAlerts: row?.interview_alerts ?? 1,
        weeklyReport: row?.weekly_report ?? 0,
      },
    });
  }
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    "INSERT INTO recruiter_preferences(user_id,preferred_language,email_enabled,application_alerts,interview_alerts,weekly_report) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET preferred_language=excluded.preferred_language,email_enabled=excluded.email_enabled,application_alerts=excluded.application_alerts,interview_alerts=excluded.interview_alerts,weekly_report=excluded.weekly_report,updated_at=CURRENT_TIMESTAMP",
  )
    .bind(
      user.id,
      ["fr", "en", "ar"].includes(body.language) ? body.language : "fr",
      body.emailEnabled ? 1 : 0,
      body.applicationAlerts ? 1 : 0,
      body.interviewAlerts ? 1 : 0,
      body.weeklyReport ? 1 : 0,
    )
    .run();
  return json({ ok: true });
}

const ADMIN_SESSION_COOKIE = "wc_admin_session";
const ADMIN_CHALLENGE_COOKIE = "wc_admin_challenge";
const adminCookie = (name, value, maxAge) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const cookieValue = (request, name) =>
  request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || null;
const afterMs = (milliseconds) =>
  new Date(Date.now() + milliseconds).toISOString();
const dbTime = (value) => {
  if (!value) return 0;
  const normalized = String(value).includes("T")
    ? String(value)
    : String(value).replace(" ", "T") + "Z";
  return new Date(normalized).getTime();
};
const validAdminSecret = (value) =>
  typeof value === "string" &&
  value.length >= 14 &&
  value.length <= 200 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value);
const validEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
function safeEqual(left, right) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1)
    mismatch |= (a[index] || 0) ^ (b[index] || 0);
  return mismatch === 0;
}
async function adminSecretHash(secret, salt, env, level) {
  return hashPassword(
    `${secret}\u0000${env.SESSION_PEPPER}\u0000workcrute-admin-${level}`,
    salt,
  );
}
async function adminConfig(env) {
  return env.DB.prepare(
    "SELECT * FROM admin_security_config WHERE id=1",
  ).first();
}
async function verifyAdminSecret(env, level, candidate) {
  if (typeof candidate !== "string" || candidate.length > 200) return false;
  const config = await adminConfig(env);
  const storedHash = config?.[`secret_${level}_hash`];
  const initial = env[`ADMIN_AUTH_SECRET_${level}`];
  if (!storedHash && !initial)
    throw bad("Configuration administrative incomplète.", 503);
  const context = `\u0000${env.SESSION_PEPPER}\u0000workcrute-admin-${level}`;
  const expected = storedHash || (await digest(initial + context));
  const actual = storedHash
    ? await adminSecretHash(
        candidate,
        config[`secret_${level}_salt`],
        env,
        level,
      )
    : await digest(candidate + context);
  return safeEqual(actual, expected);
}
async function adminIpHash(request, env) {
  const forwarded =
    request.headers.get("cf-connecting-ip") ||
    (env.ENVIRONMENT !== "production"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      : null) ||
    "unavailable";
  return digest(`${forwarded}\u0000${env.SESSION_PEPPER}`);
}
function assertAdminOrigin(request, env) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (
    origin &&
    origin !== new URL(request.url).origin &&
    origin !== env.APP_ORIGIN
  )
    throw bad("Origine de requête refusée.", 403);
}
async function adminAudit(
  env,
  sessionId,
  action,
  type,
  id,
  before,
  after,
  metadata = {},
) {
  await env.DB.prepare(
    "INSERT INTO admin_audit_logs(id,admin_session_id,action,resource_type,resource_id,before_json,after_json,metadata_json) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      sessionId || null,
      action,
      type,
      id || null,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      JSON.stringify(metadata),
    )
    .run();
  if (action === "admin_login")
    await platformEvent(env, "ADMIN_LOGIN", "security", null, type, id);
  if (["secret_changed", "admin_email_changed"].includes(action))
    await platformEvent(
      env,
      "ADMIN_SETTING_CHANGED",
      "security",
      null,
      type,
      id,
      { setting: action },
    );
}
async function adminNotice(
  env,
  category,
  title,
  body,
  severity = "info",
  href = null,
) {
  await env.DB.prepare(
    "INSERT INTO admin_notifications(id,category,title,body,severity,href) VALUES(?,?,?,?,?,?)",
  )
    .bind(crypto.randomUUID(), category, title, body, severity, href)
    .run();
}
async function adminRateState(env, bucketKey) {
  const row = await env.DB.prepare(
    "SELECT * FROM admin_rate_limits WHERE bucket_key=?",
  )
    .bind(bucketKey)
    .first();
  if (!row) return null;
  if (row.blocked_until && row.blocked_until > now()) return row;
  if (dbTime(row.window_started_at) < Date.now() - 15 * 60 * 1000) {
    await env.DB.prepare("DELETE FROM admin_rate_limits WHERE bucket_key=?")
      .bind(bucketKey)
      .run();
    return null;
  }
  return row;
}
async function assertAdminRate(env, bucketKey) {
  const row = await adminRateState(env, bucketKey);
  if (row?.blocked_until && row.blocked_until > now()) {
    const retry = Math.max(
      1,
      Math.ceil((new Date(row.blocked_until) - Date.now()) / 1000),
    );
    throw json(
      { error: "Trop de tentatives. Réessayez plus tard.", retryAfter: retry },
      429,
      {
        "retry-after": String(retry),
      },
    );
  }
}
async function adminRateFailure(env, bucketKey) {
  const row = await adminRateState(env, bucketKey);
  const count = (row?.failure_count || 0) + 1;
  const blockedUntil = count >= 5 ? afterMs(15 * 60 * 1000) : null;
  await env.DB.prepare(
    "INSERT INTO admin_rate_limits(bucket_key,failure_count,window_started_at,blocked_until,updated_at) VALUES(?,?,CURRENT_TIMESTAMP,?,CURRENT_TIMESTAMP) ON CONFLICT(bucket_key) DO UPDATE SET failure_count=?,blocked_until=?,updated_at=CURRENT_TIMESTAMP",
  )
    .bind(bucketKey, count, blockedUntil, count, blockedUntil)
    .run();
  return blockedUntil;
}
async function logAdminAttempt(env, ipHash, step, success, outcome) {
  await env.DB.prepare(
    "INSERT INTO admin_login_attempts(id,ip_hash,step,success,outcome) VALUES(?,?,?,?,?)",
  )
    .bind(crypto.randomUUID(), ipHash, step, success ? 1 : 0, outcome)
    .run();
}
async function adminFor(request, env) {
  const raw = cookieValue(request, ADMIN_SESSION_COOKIE);
  if (!raw) return null;
  const row = await env.DB.prepare(
    "SELECT * FROM admin_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>? AND idle_expires_at>?",
  )
    .bind(await digest(raw + env.SESSION_PEPPER), now(), now())
    .first();
  if (!row) return null;
  const expectedIp = await adminIpHash(request, env);
  if (!safeEqual(row.ip_hash, expectedIp)) return null;
  if (Date.now() - dbTime(row.last_seen_at) > 5 * 60 * 1000)
    await env.DB.prepare(
      "UPDATE admin_sessions SET last_seen_at=CURRENT_TIMESTAMP,idle_expires_at=? WHERE id=?",
    )
      .bind(afterMs(30 * 60 * 1000), row.id)
      .run();
  return row;
}
async function requireAdmin(request, env) {
  assertAdminOrigin(request, env);
  const session = await adminFor(request, env);
  if (!session) throw bad("Authentification administrateur requise.", 401);
  return session;
}
async function adminAuthStepOne(request, env) {
  assertAdminOrigin(request, env);
  const body = await request.json().catch(() => ({}));
  const ipHash = await adminIpHash(request, env);
  const bucket = `admin-auth:${ipHash}`;
  await assertAdminRate(env, bucket);
  if (!(await verifyAdminSecret(env, 1, body.secret))) {
    const blocked = await adminRateFailure(env, bucket);
    await logAdminAttempt(
      env,
      ipHash,
      1,
      false,
      blocked ? "blocked" : "invalid",
    );
    if (blocked)
      await adminNotice(
        env,
        "security",
        "Accès administrateur temporairement bloqué",
        "Le seuil de tentatives a été atteint.",
        "critical",
        "/admin/journal-activite/",
      );
    if (blocked)
      try {
        await enqueueAdminEmail(env, "suspicious_admin_login", "admin_login", crypto.randomUUID());
      } catch {}
    return bad("Secret incorrect.", 401);
  }
  const raw = token();
  await env.DB.prepare(
    "INSERT INTO admin_auth_challenges(id,token_hash,ip_hash,expires_at) VALUES(?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      await digest(raw + env.SESSION_PEPPER),
      ipHash,
      afterMs(5 * 60 * 1000),
    )
    .run();
  await logAdminAttempt(env, ipHash, 1, true, "verified");
  return json({ ok: true, nextStep: 2 }, 200, {
    "set-cookie": adminCookie(ADMIN_CHALLENGE_COOKIE, raw, 300),
  });
}
async function adminAuthStepTwo(request, env) {
  assertAdminOrigin(request, env);
  const body = await request.json().catch(() => ({}));
  const ipHash = await adminIpHash(request, env);
  const bucket = `admin-auth:${ipHash}`;
  await assertAdminRate(env, bucket);
  const rawChallenge = cookieValue(request, ADMIN_CHALLENGE_COOKIE);
  const challenge = rawChallenge
    ? await env.DB.prepare(
        "SELECT * FROM admin_auth_challenges WHERE token_hash=? AND ip_hash=? AND consumed_at IS NULL AND expires_at>?",
      )
        .bind(await digest(rawChallenge + env.SESSION_PEPPER), ipHash, now())
        .first()
    : null;
  if (!challenge) return bad("La première étape a expiré.", 401);
  if (!(await verifyAdminSecret(env, 2, body.secret))) {
    const blocked = await adminRateFailure(env, bucket);
    await logAdminAttempt(
      env,
      ipHash,
      2,
      false,
      blocked ? "blocked" : "invalid",
    );
    if (blocked) {
      await adminNotice(env, "security", "Accès administrateur temporairement bloqué", "Le seuil de tentatives a été atteint à l’étape 2.", "critical", "/admin/journal-activite/");
      try {
        await enqueueAdminEmail(env, "suspicious_admin_login", "admin_login", crypto.randomUUID());
      } catch {}
    }
    return bad("Secret incorrect.", 401);
  }
  const rawSession = token();
  const sessionId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE admin_auth_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(challenge.id),
    env.DB.prepare(
      "INSERT INTO admin_sessions(id,token_hash,ip_hash,expires_at,idle_expires_at) VALUES(?,?,?,?,?)",
    ).bind(
      sessionId,
      await digest(rawSession + env.SESSION_PEPPER),
      ipHash,
      afterMs(8 * 60 * 60 * 1000),
      afterMs(30 * 60 * 1000),
    ),
    env.DB.prepare("DELETE FROM admin_rate_limits WHERE bucket_key=?").bind(
      bucket,
    ),
  ]);
  await logAdminAttempt(env, ipHash, 2, true, "authenticated");
  await adminAudit(env, sessionId, "admin_login", "admin_session", sessionId);
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
  });
  headers.append(
    "set-cookie",
    adminCookie(ADMIN_SESSION_COOKIE, rawSession, 8 * 60 * 60),
  );
  headers.append("set-cookie", adminCookie(ADMIN_CHALLENGE_COOKIE, "", 0));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
async function adminLogout(request, env) {
  assertAdminOrigin(request, env);
  const raw = cookieValue(request, ADMIN_SESSION_COOKIE);
  const session = await adminFor(request, env);
  if (raw)
    await env.DB.prepare(
      "UPDATE admin_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?",
    )
      .bind(await digest(raw + env.SESSION_PEPPER))
      .run();
  if (session)
    await adminAudit(
      env,
      session.id,
      "admin_logout",
      "admin_session",
      session.id,
    );
  return json({ ok: true }, 200, {
    "set-cookie": adminCookie(ADMIN_SESSION_COOKIE, "", 0),
  });
}
async function adminMe(request, env) {
  const session = await requireAdmin(request, env);
  const config = await adminConfig(env);
  const unread = await env.DB.prepare(
    "SELECT COUNT(*) total FROM admin_notifications WHERE read_at IS NULL",
  ).first();
  return json({
    admin: {
      sessionExpiresAt: session.expires_at,
      idleExpiresAt: session.idle_expires_at,
    },
    security: {
      email: config?.primary_email || null,
      emailVerified: Boolean(config?.primary_email_verified_at),
      secret1Rotated: Boolean(config?.secret_1_hash),
      secret2Rotated: Boolean(config?.secret_2_hash),
    },
    unreadNotifications: unread?.total || 0,
  });
}
function verificationCode(env) {
  if (
    env.ENVIRONMENT === "test" &&
    /^\d{6}$/.test(env.ADMIN_EMAIL_TEST_CODE || "")
  )
    return env.ADMIN_EMAIL_TEST_CODE;
  const values = crypto.getRandomValues(new Uint32Array(1));
  return String(values[0] % 1000000).padStart(6, "0");
}
async function adminCodeHash(code, env, id) {
  return digest(`${code}\u0000${id}\u0000${env.SESSION_PEPPER}`);
}
async function requestAdminSecretChange(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json().catch(() => ({}));
  const level = Number(body.level);
  if (
    ![1, 2].includes(level) ||
    !(await verifyAdminSecret(env, level, body.currentSecret))
  )
    return bad("Le secret actuel est incorrect.", 401);
  if (
    !validAdminSecret(body.newSecret) ||
    body.newSecret !== body.confirmSecret
  )
    return bad("Le nouveau secret est invalide ou sa confirmation diffère.");
  if (safeEqual(body.currentSecret, body.newSecret))
    return bad("Le nouveau secret doit être différent.");
  const config = await adminConfig(env);
  if (!config?.primary_email_verified_at)
    return bad("Vérifiez d’abord l’adresse email administrative.", 409);
  const id = crypto.randomUUID();
  const salt = token();
  const code = verificationCode(env);
  const delivered = await sendEmail(env, {
    to: config.primary_email,
    template: "admin_verification",
    code,
  });
  if (!delivered)
    return bad("Le service email administratif est indisponible.", 503);
  await env.DB.prepare(
    "INSERT INTO admin_secret_changes(id,admin_session_id,secret_level,new_secret_hash,new_secret_salt,verification_code_hash,expires_at) VALUES(?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      session.id,
      level,
      await adminSecretHash(body.newSecret, salt, env, level),
      salt,
      await adminCodeHash(code, env, id),
      afterMs(10 * 60 * 1000),
    )
    .run();
  await adminAudit(
    env,
    session.id,
    "secret_change_requested",
    "admin_secret",
    String(level),
  );
  return json({ ok: true, requestId: id });
}
async function confirmAdminSecretChange(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json().catch(() => ({}));
  const id = clean(body.requestId, 80);
  const row = await env.DB.prepare(
    "SELECT * FROM admin_secret_changes WHERE id=? AND admin_session_id=? AND completed_at IS NULL AND expires_at>?",
  )
    .bind(id, session.id, now())
    .first();
  if (!row || row.attempts >= 5)
    return bad("Demande expirée ou invalide.", 410);
  if (
    !safeEqual(
      await adminCodeHash(String(body.code || ""), env, id),
      row.verification_code_hash,
    )
  ) {
    await env.DB.prepare(
      "UPDATE admin_secret_changes SET attempts=attempts+1 WHERE id=?",
    )
      .bind(id)
      .run();
    return bad("Code de validation incorrect.", 401);
  }
  const config = await adminConfig(env);
  const column = row.secret_level === 1 ? "secret_1" : "secret_2";
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE admin_security_config SET ${column}_hash=?,${column}_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`,
    ).bind(row.new_secret_hash, row.new_secret_salt),
    env.DB.prepare(
      "UPDATE admin_secret_changes SET completed_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(id),
    env.DB.prepare(
      "UPDATE admin_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id<>? AND revoked_at IS NULL",
    ).bind(session.id),
  ]);
  await adminAudit(
    env,
    session.id,
    "secret_changed",
    "admin_secret",
    String(row.secret_level),
    { rotated: Boolean(config?.[`${column}_hash`]) },
    { rotated: true },
  );
  await adminNotice(
    env,
    "security",
    `Secret niveau ${row.secret_level} modifié`,
    "Les autres sessions administrateur ont été révoquées.",
    "success",
    "/admin/securite/",
  );
  return json({ ok: true });
}
async function requestAdminEmailChange(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json().catch(() => ({}));
  const email = clean(body.email, 254).toLowerCase();
  if (!validEmail(email)) return bad("Adresse email invalide.");
  if (!(await verifyAdminSecret(env, 2, body.secret2)))
    return bad("Le secret de niveau 2 est incorrect.", 401);
  const id = crypto.randomUUID();
  const code = verificationCode(env);
  const delivered = await sendEmail(env, {
    to: email,
    template: "admin_verification",
    code,
  });
  if (!delivered)
    return bad("Le service email administratif est indisponible.", 503);
  await env.DB.prepare(
    "INSERT INTO admin_email_changes(id,admin_session_id,new_email,verification_code_hash,expires_at) VALUES(?,?,?,?,?)",
  )
    .bind(
      id,
      session.id,
      email,
      await adminCodeHash(code, env, id),
      afterMs(10 * 60 * 1000),
    )
    .run();
  await adminAudit(
    env,
    session.id,
    "admin_email_change_requested",
    "admin_email",
    null,
  );
  return json({ ok: true, requestId: id });
}
async function confirmAdminEmailChange(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json().catch(() => ({}));
  const id = clean(body.requestId, 80);
  const row = await env.DB.prepare(
    "SELECT * FROM admin_email_changes WHERE id=? AND admin_session_id=? AND completed_at IS NULL AND expires_at>?",
  )
    .bind(id, session.id, now())
    .first();
  if (!row || row.attempts >= 5)
    return bad("Demande expirée ou invalide.", 410);
  if (
    !safeEqual(
      await adminCodeHash(String(body.code || ""), env, id),
      row.verification_code_hash,
    )
  ) {
    await env.DB.prepare(
      "UPDATE admin_email_changes SET attempts=attempts+1 WHERE id=?",
    )
      .bind(id)
      .run();
    return bad("Code de validation incorrect.", 401);
  }
  const before = await adminConfig(env);
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE admin_security_config SET primary_email=?,primary_email_verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=1",
    ).bind(row.new_email),
    env.DB.prepare(
      "UPDATE admin_email_changes SET completed_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(id),
  ]);
  await adminAudit(
    env,
    session.id,
    "admin_email_changed",
    "admin_email",
    null,
    { emailConfigured: Boolean(before?.primary_email) },
    { emailConfigured: true, verified: true },
  );
  return json({ ok: true, email: row.new_email });
}
async function adminEmailTest(request, env) {
  const session = await requireAdmin(request, env);
  const config = await adminConfig(env);
  if (!config?.primary_email_verified_at)
    return bad("Aucune adresse administrative vérifiée.", 409);
  if (
    !(await sendEmail(env, {
      to: config.primary_email,
      template: "admin_test",
    }))
  )
    return bad("Le service email administratif est indisponible.", 503);
  await adminAudit(
    env,
    session.id,
    "admin_email_test_sent",
    "admin_email",
    null,
  );
  return json({ ok: true });
}
const adminEmailFlags = {
  newCandidate: "email_new_candidate",
  newRecruiter: "email_new_recruiter",
  newJob: "email_new_job",
  newApplication: "email_new_application",
  criticalError: "email_critical_error",
  suspiciousAdminLogin: "email_suspicious_admin_login",
};
async function adminEmailSettings(request, env, path) {
  const session = await requireAdmin(request, env);
  if (path === "/api/admin/email-settings" && request.method === "GET") {
    const config = await adminConfig(env);
    const { results = [] } = await env.DB.prepare(
      "SELECT id,event_type,resource_type,resource_id,recipient,status,attempts,max_attempts,next_attempt_at,last_error,sent_at,created_at FROM admin_email_outbox ORDER BY created_at DESC LIMIT 30",
    ).all();
    const { results: deliveryLogs = [] } = await env.DB.prepare(
      "SELECT outbox_id,event_type,subject,attachment_names_json,body_snapshot_json,success,error_message,created_at FROM admin_email_delivery_logs ORDER BY created_at DESC LIMIT 30",
    ).all();
    return json({
      email: config.primary_email || null,
      verified: Boolean(config.primary_email_verified_at),
      attachmentMode: config.email_attachment_mode || "pdf",
      events: Object.fromEntries(
        Object.entries(adminEmailFlags).map(([key, column]) => [key, Boolean(config[column])]),
      ),
      outbox: results,
      deliveryLogs,
    });
  }
  if (path === "/api/admin/email-settings" && request.method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    const mode = ["none", "pdf", "csv", "both"].includes(body.attachmentMode)
      ? body.attachmentMode
      : null;
    if (!mode) return bad("Format de pièce jointe invalide.");
    const before = await adminConfig(env);
    const values = Object.keys(adminEmailFlags).map((key) => body.events?.[key] === false ? 0 : 1);
    await env.DB.prepare(
      "UPDATE admin_security_config SET email_attachment_mode=?,email_new_candidate=?,email_new_recruiter=?,email_new_job=?,email_new_application=?,email_critical_error=?,email_suspicious_admin_login=?,updated_at=CURRENT_TIMESTAMP WHERE id=1",
    ).bind(mode, ...values).run();
    await adminAudit(env, session.id, "admin_email_settings_changed", "admin_email_settings", "1", {
      attachmentMode: before.email_attachment_mode,
      events: Object.fromEntries(Object.entries(adminEmailFlags).map(([key, column]) => [key, Boolean(before[column])])),
    }, { attachmentMode: mode, events: Object.fromEntries(Object.keys(adminEmailFlags).map((key, index) => [key, Boolean(values[index])])) });
    await platformEvent(env, "ADMIN_SETTING_CHANGED", "security", null, "admin_email_settings", "1", { setting: "administrative_emails" });
    return json({ ok: true });
  }
  if (path === "/api/admin/email-settings/test" && request.method === "POST") {
    const config = await adminConfig(env);
    if (!config?.primary_email_verified_at) return bad("Aucune adresse administrative vérifiée.", 409);
    const id = await enqueueAdminEmail(env, "test", "admin_email", crypto.randomUUID(), { recipient: config.primary_email });
    const result = await processAdminEmailOutbox(env, 10);
    const delivery = await env.DB.prepare("SELECT status,last_error FROM admin_email_outbox WHERE id=?").bind(id).first();
    await adminAudit(env, session.id, "admin_email_test_sent", "admin_email", id, null, { status: delivery?.status });
    return delivery?.status === "sent" ? json({ ok: true, result }) : bad("L’email de test a échoué et sera réessayé automatiquement.", 503);
  }
  const retry = path.match(/^\/api\/admin\/email-settings\/outbox\/([^/]+)\/retry$/);
  if (retry && request.method === "POST") {
    const config = await adminConfig(env);
    await env.DB.prepare("UPDATE admin_email_outbox SET status='pending',attempts=0,last_error=NULL,next_attempt_at=CURRENT_TIMESTAMP,recipient=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='failed'").bind(config.primary_email, retry[1]).run();
    const result = await processAdminEmailOutbox(env, 10);
    await adminAudit(env, session.id, "admin_email_retried", "admin_email", retry[1]);
    return json({ ok: true, result });
  }
  if (path === "/api/admin/email-settings/process" && request.method === "POST")
    return json({ ok: true, result: await processAdminEmailOutbox(env, 25) });
  return bad("Action non prise en charge.", 405);
}
async function platformSettingsApi(request, env, path) {
  if (path === "/api/public/config" && request.method === "GET") {
    const settings = await getPlatformSettings(env);
    const assets = await env.DB.prepare("SELECT kind,updated_at FROM platform_brand_assets").all();
    return json({ ...settings, brandAssets: Object.fromEntries((assets.results || []).map((row) => [row.kind, { url: `/api/public/brand/${row.kind}?v=${encodeURIComponent(row.updated_at)}`, updatedAt: row.updated_at }])) }, 200, { "cache-control": "public,max-age=60" });
  }
  const brand = path.match(/^\/api\/public\/brand\/(logo|favicon)$/);
  if (brand && request.method === "GET") {
    const asset = await env.DB.prepare("SELECT content_type,data,updated_at FROM platform_brand_assets WHERE kind=?").bind(brand[1]).first();
    if (!asset) return bad("Ressource introuvable.", 404);
    return new Response(asset.data, { headers: { "content-type": asset.content_type, "cache-control": "public,max-age=86400", etag: `\"${asset.updated_at}\"` } });
  }
  const session = await requireAdmin(request, env);
  if (path === "/api/admin/platform-settings" && request.method === "GET")
    return json({ settings: await getPlatformSettings(env) });
  const sectionMatch = path.match(/^\/api\/admin\/platform-settings\/(general|registrations|documents|jobs|applications|interviews|matching|chatbot|maintenance)$/);
  if (sectionMatch && request.method === "PATCH") {
    const before = (await getPlatformSettings(env))[sectionMatch[1]], body = await request.json().catch(() => null);
    let value;
    try { value = await savePlatformSection(env, sectionMatch[1], body); }
    catch (error) { return bad(String(error).includes("MATCHING_WEIGHTS_TOTAL") ? "La somme des poids du matching doit être égale à 100." : "Paramètres invalides."); }
    await adminAudit(env, session.id, "platform_settings_changed", "platform_settings", sectionMatch[1], before, value);
    await platformEvent(env, "ADMIN_SETTING_CHANGED", "security", null, "platform_settings", sectionMatch[1], { section: sectionMatch[1] });
    return json({ ok: true, value });
  }
  const assetMatch = path.match(/^\/api\/admin\/platform-settings\/brand\/(logo|favicon)$/);
  if (assetMatch && request.method === "POST") {
    const form = await request.formData(), file = form.get("file"), kind = assetMatch[1];
    const allowed = kind === "logo" ? ["image/png", "image/jpeg", "image/webp"] : ["image/png", "image/x-icon", "image/vnd.microsoft.icon"];
    const max = kind === "logo" ? 512 * 1024 : 128 * 1024;
    if (!(file instanceof File) || !allowed.includes(file.type) || !file.size || file.size > max)
      return bad(kind === "logo" ? "Logo invalide (PNG, JPEG ou WebP, 512 Ko maximum)." : "Favicon invalide (PNG ou ICO, 128 Ko maximum).", 415);
    await env.DB.prepare("INSERT INTO platform_brand_assets(kind,content_type,data,size_bytes,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(kind) DO UPDATE SET content_type=excluded.content_type,data=excluded.data,size_bytes=excluded.size_bytes,updated_at=CURRENT_TIMESTAMP").bind(kind, file.type, await file.arrayBuffer(), file.size).run();
    await adminAudit(env, session.id, "platform_brand_changed", "platform_brand_asset", kind, null, { contentType: file.type, sizeBytes: file.size });
    return json({ ok: true });
  }
  if (assetMatch && request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM platform_brand_assets WHERE kind=?").bind(assetMatch[1]).run();
    await adminAudit(env, session.id, "platform_brand_removed", "platform_brand_asset", assetMatch[1]);
    return new Response(null, { status: 204 });
  }
  return bad("Action non prise en charge.", 405);
}

async function adminErrors(request, env, path) {
  const session = await requireAdmin(request, env);
  if (path === "/api/admin/errors" && request.method === "GET") {
    const url = new URL(request.url), filters = [], binds = [];
    for (const [key,column,allowed] of [["status","status",["new","in_progress","resolved","ignored"]],["service","service",["api","auth","database","email","upload","ai","frontend"]],["severity","severity",["info","warning","error","critical"]]]) {
      const value = clean(url.searchParams.get(key), 40);
      if (allowed.includes(value)) { filters.push(`${column}=?`); binds.push(value); }
    }
    const query = clean(url.searchParams.get("q"), 100);
    if (query) { filters.push("(code LIKE ? OR user_message LIKE ? OR request_id LIKE ? OR route LIKE ?)"); binds.push(...Array(4).fill(`%${query}%`)); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const [items,stats] = await Promise.all([
      env.DB.prepare(`SELECT id,request_id,severity,service,code,user_message,user_id,route,method,http_status,status,admin_note,occurred_at,updated_at FROM app_errors ${where} ORDER BY occurred_at DESC LIMIT 200`).bind(...binds).all(),
      env.DB.prepare("SELECT COUNT(*) today,SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) critical,SUM(CASE WHEN service='email' THEN 1 ELSE 0 END) email,SUM(CASE WHEN service='upload' THEN 1 ELSE 0 END) upload,SUM(CASE WHEN service='ai' THEN 1 ELSE 0 END) ai,SUM(CASE WHEN service='api' THEN 1 ELSE 0 END) api FROM app_errors WHERE date(occurred_at)=date('now')").first(),
    ]);
    return json({ items: items.results || [], stats: { today:Number(stats?.today||0),critical:Number(stats?.critical||0),email:Number(stats?.email||0),upload:Number(stats?.upload||0),ai:Number(stats?.ai||0),api:Number(stats?.api||0) } });
  }
  const match = path.match(/^\/api\/admin\/errors\/([^/]+)$/);
  if (match && request.method === "PATCH") {
    const body = await request.json().catch(() => ({})), status = clean(body.status, 30), note = clean(body.note, 2000);
    if (!["new","in_progress","resolved","ignored"].includes(status)) return bad("Statut d’erreur invalide.");
    const before = await env.DB.prepare("SELECT status,admin_note FROM app_errors WHERE id=?").bind(match[1]).first();
    if (!before) return bad("Erreur introuvable.", 404);
    await env.DB.prepare("UPDATE app_errors SET status=?,admin_note=?,resolved_at=CASE WHEN ?='resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,note||null,status,match[1]).run();
    await adminAudit(env,session.id,"app_error_updated","app_error",match[1],before,{status,note:note||null});
    return json({ ok:true });
  }
  return bad("Action non prise en charge.",405);
}
async function reportFrontendError(request, env, requestId) {
  const body = await request.json().catch(() => ({}));
  await recordAppError(env,{requestId,severity:"error",service:"frontend",code:clean(body.code,80)||"FRONTEND_ERROR",userMessage:"Une erreur d’affichage a été interceptée.",technicalMessage:clean(body.message,500),route:clean(body.route,300),method:"CLIENT",httpStatus:null});
  return json({ ok:true },202);
}
async function adminNotifications(request, env, path) {
  await requireAdmin(request, env);
  if (request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT id,category,title,body,severity,href,read_at,created_at FROM admin_notifications ORDER BY created_at DESC LIMIT 50",
    ).all();
    return json({ items: results });
  }
  const id = path.split("/").filter(Boolean).pop();
  await env.DB.prepare(
    "UPDATE admin_notifications SET read_at=CURRENT_TIMESTAMP WHERE id=?",
  )
    .bind(id)
    .run();
  return json({ ok: true });
}
async function adminAuditList(request, env) {
  await requireAdmin(request, env);
  const { results = [] } = await env.DB.prepare(
    "SELECT id,admin_session_id,action,resource_type,resource_id,before_json,after_json,metadata_json,created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100",
  ).all();
  return json({
    items: results.map((item) => ({
      ...item,
      before: parseStored(item.before_json, null),
      after: parseStored(item.after_json, null),
      metadata: parseStored(item.metadata_json, {}),
      before_json: undefined,
      after_json: undefined,
      metadata_json: undefined,
    })),
  });
}
async function adminSearch(request, env) {
  await requireAdmin(request, env);
  const query = clean(new URL(request.url).searchParams.get("q"), 120);
  if (query.length < 2) return json({ items: [] });
  const like = `%${query}%`;
  const { results = [] } = await env.DB.prepare(
    "SELECT id,email label,role type,'/admin/' || CASE role WHEN 'candidate' THEN 'demandeurs' WHEN 'recruiter' THEN 'recruteurs' ELSE 'tableau-de-bord' END || '/' href FROM users WHERE email LIKE ? UNION ALL SELECT id,title label,'job' type,'/admin/offres/' href FROM job_offers WHERE title LIKE ? UNION ALL SELECT id,id label,'application' type,'/admin/candidatures/' href FROM applications WHERE id LIKE ? LIMIT 20",
  )
    .bind(like, like, like)
    .all();
  return json({ items: results });
}
async function adminStats(request, env) {
  await requireAdmin(request, env);
  const row = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM users WHERE role='candidate') candidates,(SELECT COUNT(*) FROM users WHERE role='recruiter') recruiters,(SELECT COUNT(*) FROM job_offers WHERE status='published') active_jobs,(SELECT COUNT(*) FROM applications) applications",
  ).first();
  return json({ stats: row });
}
const adminEventCategories = new Set([
  "candidates",
  "recruiters",
  "jobs",
  "applications",
  "companies",
  "interviews",
  "security",
  "errors",
]);
async function adminDashboard(request, env) {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  const requestedCategory = clean(url.searchParams.get("category"), 30);
  const category = adminEventCategories.has(requestedCategory)
    ? requestedCategory
    : null;
  const after = Math.max(
    0,
    Number.parseInt(url.searchParams.get("after") || "0", 10) || 0,
  );

  const [totals, today] = await Promise.all([
    env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM users WHERE role='candidate') candidates,(SELECT COUNT(*) FROM users WHERE role='recruiter') recruiters,(SELECT COUNT(*) FROM companies) companies,(SELECT COUNT(*) FROM job_offers WHERE status='published') active_jobs,(SELECT COUNT(*) FROM applications) applications,(SELECT COUNT(*) FROM interviews) interviews",
    ).first(),
    env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM users WHERE date(created_at)=date('now')) registrations,(SELECT COUNT(*) FROM applications WHERE date(created_at)=date('now')) applications,(SELECT COUNT(*) FROM job_offers WHERE status='published' AND date(published_at)=date('now')) jobs_published,(SELECT COUNT(*) FROM interviews WHERE date(created_at)=date('now')) interviews_created,(SELECT COUNT(*) FROM platform_events WHERE event_type='SYSTEM_ERROR' AND date(created_at)=date('now')) errors",
    ).first(),
  ]);

  const checks = {
    database: true,
    storage: false,
    authentication: false,
    email: false,
  };
  try {
    const storageTable = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='document_chunks'",
    ).first();
    checks.storage = Boolean(env.DOCUMENTS || storageTable?.name);
  } catch {
    checks.database = false;
  }
  checks.authentication = Boolean(
    env.ADMIN_AUTH_SECRET_1 && env.ADMIN_AUTH_SECRET_2 && env.SESSION_PEPPER,
  );
  checks.email = Boolean(env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM);
  const status =
    !checks.database || !checks.authentication
      ? "incident"
      : !checks.storage || !checks.email
        ? "degraded"
        : "operational";

  let query =
    "SELECT id,event_type,category,resource_type,resource_id,metadata_json,created_at FROM platform_events";
  const conditions = [];
  const bindings = [];
  if (after) {
    conditions.push("id>?");
    bindings.push(after);
  }
  if (category) {
    conditions.push("category=?");
    bindings.push(category);
  }
  if (conditions.length) query += ` WHERE ${conditions.join(" AND ")}`;
  query += " ORDER BY id DESC LIMIT 50";
  const activityStatement = env.DB.prepare(query);
  const { results = [] } = bindings.length
    ? await activityStatement.bind(...bindings).all()
    : await activityStatement.all();
  const newestStatement = env.DB.prepare(
    `SELECT COALESCE(MAX(id),0) id FROM platform_events${category ? " WHERE category=?" : ""}`,
  );
  const newest = category
    ? await newestStatement.bind(category).first()
    : await newestStatement.first();
  return json({
    system: { status, checks },
    totals: totals || {},
    today: today || {},
    activity: results.map((item) => ({
      ...item,
      metadata: parseStored(item.metadata_json, {}),
      metadata_json: undefined,
    })),
    lastEventId: Number(newest?.id || 0),
    pollAfterMs: 20000,
  });
}
const adminResources = new Set([
  "candidates",
  "recruiters",
  "companies",
  "jobs",
  "applications",
  "interviews",
]);
const adminAccountStatuses = new Set(["active", "suspended"]);
const adminInterviewStatuses = new Set([
  "scheduled",
  "confirmed",
  "declined",
  "reschedule_requested",
  "cancelled",
  "completed",
]);
const adminJobStatuses = new Set([
  "draft",
  "published",
  "closed",
  "archived",
  "suspended",
]);
const adminApplicationStatuses = new Set([
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "rejected",
  "accepted",
  "withdrawn",
]);
function adminQueryParts(url, searchColumns, aliases = {}) {
  const params = url.searchParams;
  const clauses = [],
    values = [];
  const search = clean(params.get("search"), 120);
  if (search) {
    clauses.push(
      `(${searchColumns.map((column) => `${column} LIKE ?`).join(" OR ")})`,
    );
    values.push(...searchColumns.map(() => `%${search}%`));
  }
  for (const [key, column] of Object.entries(aliases)) {
    if (key === "dateColumn") continue;
    const value = clean(params.get(key), 120);
    if (value) {
      const exact = key === "status";
      clauses.push(`${column}${exact ? "=" : " LIKE "}?`);
      values.push(exact ? value : `%${value}%`);
    }
  }
  const from = clean(params.get("from"), 10),
    to = clean(params.get("to"), 10);
  if (from) {
    clauses.push(`${aliases.dateColumn || "u.created_at"}>=?`);
    values.push(`${from} 00:00:00`);
  }
  if (to) {
    clauses.push(`${aliases.dateColumn || "u.created_at"}<=?`);
    values.push(`${to} 23:59:59`);
  }
  return {
    where: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}
async function adminPaged(
  env,
  selectSql,
  countSql,
  parts,
  url,
  orderColumn = "created_at",
) {
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") || "1", 10) || 1,
  );
  const pageSize = Math.min(
    100,
    Math.max(
      10,
      Number.parseInt(url.searchParams.get("pageSize") || "20", 10) || 20,
    ),
  );
  const offset = (page - 1) * pageSize;
  const [rows, count] = await Promise.all([
    env.DB.prepare(
      `${selectSql}${parts.where} ORDER BY ${orderColumn} DESC LIMIT ? OFFSET ?`,
    )
      .bind(...parts.values, pageSize, offset)
      .all(),
    env.DB.prepare(`${countSql}${parts.where}`)
      .bind(...parts.values)
      .first(),
  ]);
  const total = Number(count?.total || 0);
  return json({
    items: rows.results || [],
    page,
    pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
function candidateCompleteness(row) {
  const values = [
    row.first_name,
    row.last_name,
    row.phone,
    row.professional_title,
    row.city,
    row.availability,
    row.introduction,
  ];
  let completed = values.filter(Boolean).length;
  if (parseStored(row.skills_json, []).length) completed += 1;
  if (parseStored(row.experience_json, []).length) completed += 1;
  if (parseStored(row.education_json, []).length) completed += 1;
  if (parseStored(row.languages_json, []).length) completed += 1;
  if (Number(row.document_count || 0)) completed += 1;
  return Math.round((completed / 12) * 100);
}
async function adminBusinessList(request, env, resource) {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  if (resource === "candidates") {
    const parts = adminQueryParts(
      url,
      [
        "u.email",
        "p.first_name",
        "p.last_name",
        "p.phone",
        "p.professional_title",
        "p.city",
      ],
      {
        city: "p.city",
        job: "p.professional_title",
        status: "u.account_status",
        dateColumn: "u.created_at",
      },
    );
    const response = await adminPaged(
      env,
      "SELECT u.id,u.email,u.account_status status,u.created_at,p.first_name,p.last_name,p.phone,p.professional_title,p.city,p.availability,p.introduction,p.skills_json,p.experience_json,p.education_json,p.languages_json,(SELECT COUNT(*) FROM documents d WHERE d.user_id=u.id AND d.deleted_at IS NULL) document_count,(SELECT COUNT(*) FROM applications a WHERE a.candidate_user_id=u.id) applications_count,COALESCE((SELECT MAX(pe.created_at) FROM platform_events pe WHERE pe.actor_user_id=u.id),u.updated_at) last_activity FROM users u JOIN candidate_profiles p ON p.user_id=u.id",
      "SELECT COUNT(*) total FROM users u JOIN candidate_profiles p ON p.user_id=u.id",
      parts,
      url,
      "u.created_at",
    );
    const data = await response.json();
    data.items = data.items.map((item) => ({
      ...item,
      profile_completion: candidateCompleteness(item),
    }));
    return json(data);
  }
  if (resource === "recruiters") {
    const parts = adminQueryParts(
      url,
      [
        "u.email",
        "p.first_name",
        "p.last_name",
        "p.phone",
        "COALESCE(c.name,p.company_name)",
      ],
      {
        company: "COALESCE(c.name,p.company_name)",
        sector: "COALESCE(c.sector,p.company_sector)",
        status: "u.account_status",
        dateColumn: "u.created_at",
      },
    );
    return adminPaged(
      env,
      "SELECT u.id,u.email,u.account_status status,u.created_at,p.first_name,p.last_name,p.phone,COALESCE(c.name,p.company_name) company_name,COALESCE(c.sector,p.company_sector) sector,(SELECT COUNT(*) FROM job_offers j WHERE j.recruiter_user_id=u.id) jobs_count,(SELECT COUNT(*) FROM applications a JOIN job_offers j ON j.id=a.job_offer_id WHERE j.recruiter_user_id=u.id) applications_count,COALESCE((SELECT MAX(pe.created_at) FROM platform_events pe WHERE pe.actor_user_id=u.id),u.updated_at) last_activity FROM users u JOIN recruiter_profiles p ON p.user_id=u.id LEFT JOIN companies c ON c.owner_user_id=u.id",
      "SELECT COUNT(*) total FROM users u JOIN recruiter_profiles p ON p.user_id=u.id LEFT JOIN companies c ON c.owner_user_id=u.id",
      parts,
      url,
      "u.created_at",
    );
  }
  if (resource === "companies") {
    const parts = adminQueryParts(url, ["c.name", "c.sector", "c.city"], {
      sector: "c.sector",
      city: "c.city",
      status: "c.status",
      dateColumn: "c.created_at",
    });
    return adminPaged(
      env,
      "SELECT c.id,c.name,c.sector,c.city,c.status,c.created_at,c.owner_user_id,(SELECT COUNT(*) FROM recruiter_profiles rp WHERE rp.user_id=c.owner_user_id) recruiters_count,(SELECT COUNT(*) FROM job_offers j WHERE j.company_id=c.id) jobs_count FROM companies c",
      "SELECT COUNT(*) total FROM companies c",
      parts,
      url,
      "c.created_at",
    );
  }
  if (resource === "jobs") {
    const parts = adminQueryParts(
      url,
      ["j.title", "c.name", "j.domain", "j.city"],
      {
        company: "c.name",
        status: "j.status",
        sector: "j.domain",
        city: "j.city",
        dateColumn: "j.created_at",
      },
    );
    return adminPaged(
      env,
      "SELECT j.id,j.title,j.domain,j.city,j.contract_type,j.status,j.created_at,j.published_at,j.company_id,c.name company_name,(SELECT COUNT(*) FROM applications a WHERE a.job_offer_id=j.id) applications_count FROM job_offers j LEFT JOIN companies c ON c.id=j.company_id",
      "SELECT COUNT(*) total FROM job_offers j LEFT JOIN companies c ON c.id=j.company_id",
      parts,
      url,
      "j.created_at",
    );
  }
  if (resource === "applications") {
    const parts = adminQueryParts(
      url,
      ["a.id", "j.title", "c.name", "cp.first_name", "cp.last_name", "u.email"],
      {
        candidate: "(cp.first_name || ' ' || cp.last_name)",
        job: "j.title",
        company: "c.name",
        status: "a.status",
        dateColumn: "a.created_at",
      },
    );
    return adminPaged(
      env,
      "SELECT a.id,a.status,a.created_at,a.updated_at,a.candidate_user_id,a.job_offer_id,cp.first_name,cp.last_name,u.email,j.title job_title,c.name company_name FROM applications a JOIN users u ON u.id=a.candidate_user_id JOIN candidate_profiles cp ON cp.user_id=u.id JOIN job_offers j ON j.id=a.job_offer_id LEFT JOIN companies c ON c.id=j.company_id",
      "SELECT COUNT(*) total FROM applications a JOIN users u ON u.id=a.candidate_user_id JOIN candidate_profiles cp ON cp.user_id=u.id JOIN job_offers j ON j.id=a.job_offer_id LEFT JOIN companies c ON c.id=j.company_id",
      parts,
      url,
      "a.created_at",
    );
  }
  const parts = adminQueryParts(
    url,
    [
      "i.id",
      "j.title",
      "c.name",
      "cp.first_name",
      "cp.last_name",
      "rp.first_name",
      "rp.last_name",
    ],
    {
      candidate: "(cp.first_name || ' ' || cp.last_name)",
      recruiter: "(rp.first_name || ' ' || rp.last_name)",
      company: "c.name",
      status: "i.status",
      dateColumn: "i.starts_at",
    },
  );
  return adminPaged(
    env,
    "SELECT i.id,i.application_id,i.starts_at,i.duration_minutes,i.interview_type,i.location,i.meeting_url,i.status,i.created_at,i.candidate_user_id,i.recruiter_user_id,j.title job_title,c.name company_name,cp.first_name candidate_first_name,cp.last_name candidate_last_name,rp.first_name recruiter_first_name,rp.last_name recruiter_last_name FROM interviews i JOIN applications a ON a.id=i.application_id JOIN job_offers j ON j.id=a.job_offer_id LEFT JOIN companies c ON c.id=j.company_id JOIN candidate_profiles cp ON cp.user_id=i.candidate_user_id JOIN recruiter_profiles rp ON rp.user_id=i.recruiter_user_id",
    "SELECT COUNT(*) total FROM interviews i JOIN applications a ON a.id=i.application_id JOIN job_offers j ON j.id=a.job_offer_id LEFT JOIN companies c ON c.id=j.company_id JOIN candidate_profiles cp ON cp.user_id=i.candidate_user_id JOIN recruiter_profiles rp ON rp.user_id=i.recruiter_user_id",
    parts,
    url,
    "i.starts_at",
  );
}
async function adminSnapshot(env, resource, id) {
  const queries = {
    candidates:
      "SELECT u.id,u.email,u.account_status,p.* FROM users u JOIN candidate_profiles p ON p.user_id=u.id WHERE u.id=?",
    recruiters:
      "SELECT u.id,u.email,u.account_status,p.* FROM users u JOIN recruiter_profiles p ON p.user_id=u.id WHERE u.id=?",
    companies: "SELECT * FROM companies WHERE id=?",
    jobs: "SELECT * FROM job_offers WHERE id=?",
    applications: "SELECT * FROM applications WHERE id=?",
    interviews: "SELECT * FROM interviews WHERE id=?",
  };
  return env.DB.prepare(queries[resource]).bind(id).first();
}
async function adminBusinessDetail(request, env, resource, id) {
  await requireAdmin(request, env);
  const item = await adminSnapshot(env, resource, id);
  if (!item) return bad("Ressource introuvable.", 404);
  const related = {};
  if (resource === "candidates") {
    related.documents =
      (
        await env.DB.prepare(
          "SELECT id,kind,original_name,size_bytes,is_default,created_at FROM documents WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC",
        )
          .bind(id)
          .all()
      ).results || [];
    related.applications =
      (
        await env.DB.prepare(
          "SELECT a.id,a.status,a.created_at,j.title,c.name company_name FROM applications a JOIN job_offers j ON j.id=a.job_offer_id LEFT JOIN companies c ON c.id=j.company_id WHERE a.candidate_user_id=? ORDER BY a.created_at DESC",
        )
          .bind(id)
          .all()
      ).results || [];
  }
  if (resource === "applications")
    related.timeline =
      (
        await env.DB.prepare(
          "SELECT h.status,h.created_at,h.actor_user_id FROM application_status_history h WHERE h.application_id=? ORDER BY h.created_at",
        )
          .bind(id)
          .all()
      ).results || [];
  return json({ item, related });
}
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
async function adminCandidateExport(request, env, id) {
  await requireAdmin(request, env);
  const row = await adminSnapshot(env, "candidates", id);
  if (!row) return bad("Candidat introuvable.", 404);
  const columns = [
    "id",
    "email",
    "first_name",
    "last_name",
    "phone",
    "professional_title",
    "city",
    "availability",
    "account_status",
    "created_at",
  ];
  const body = `\uFEFF${columns.join(",")}\r\n${columns.map((key) => csvCell(row[key])).join(",")}\r\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="candidate-${id}.csv"`,
      "x-content-type-options": "nosniff",
    },
  });
}
async function adminBusinessMutation(request, env, resource, id, action) {
  const session = await requireAdmin(request, env);
  assertAdminOrigin(request, env);
  const body = await request.json().catch(() => ({}));
  const before = id ? await adminSnapshot(env, resource, id) : null;
  if (id && !before) return bad("Ressource introuvable.", 404);
  if (
    ["suspend", "reactivate"].includes(action) &&
    ["candidates", "recruiters"].includes(resource)
  ) {
    const status = action === "suspend" ? "suspended" : "active";
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE users SET account_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(status, id),
      ...(status === "suspended"
        ? [env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(id)]
        : []),
    ]);
  } else if (
    ["suspend", "reactivate", "close"].includes(action) &&
    resource === "jobs"
  ) {
    if (action === "suspend" && before.status !== "published")
      return bad("Seule une offre publiée peut être suspendue.", 409);
    if (action === "reactivate" && before.status !== "suspended")
      return bad("Cette offre n’est pas suspendue.", 409);
    const status =
      action === "suspend"
        ? "suspended"
        : action === "close"
          ? "closed"
          : "published";
    await env.DB.prepare(
      "UPDATE job_offers SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(status, id)
      .run();
  } else if (
    ["suspend", "reactivate"].includes(action) &&
    resource === "companies"
  ) {
    await env.DB.prepare(
      "UPDATE companies SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(action === "suspend" ? "suspended" : "active", id)
      .run();
  } else if (request.method === "DELETE") {
    const tables = {
      candidates: "users",
      recruiters: "users",
      companies: "companies",
      jobs: "job_offers",
      applications: "applications",
      interviews: "interviews",
    };
    await env.DB.prepare(`DELETE FROM ${tables[resource]} WHERE id=?`)
      .bind(id)
      .run();
  } else if (resource === "candidates" && request.method === "PATCH") {
    if (!validEmail(clean(body.email, 254)) || !validPhone(body.phone))
      return bad("Email ou téléphone invalide.");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE users SET email=?,account_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(
        clean(body.email, 254).toLowerCase(),
        adminAccountStatuses.has(body.status)
          ? body.status
          : before.account_status,
        id,
      ),
      env.DB.prepare(
        "UPDATE candidate_profiles SET first_name=?,last_name=?,phone=?,professional_title=?,city=?,availability=?,availability_details=?,introduction=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
      ).bind(
        clean(body.firstName, 80),
        clean(body.lastName, 80),
        String(body.phone).replace(/[\\s.-]/g, ""),
        clean(body.professionalTitle, 120) || null,
        clean(body.city, 120) || null,
        clean(body.availability, 40) || null,
        clean(body.availabilityDetails, 160) || null,
        clean(body.introduction, 1000) || null,
        id,
      ),
    ]);
  } else if (resource === "recruiters" && request.method === "POST") {
    if (
      !validEmail(clean(body.email, 254)) ||
      !validPhone(body.phone) ||
      !validPassword(body.password)
    )
      return bad("Informations recruteur invalides.");
    id = crypto.randomUUID();
    const salt = token();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users(id,email,password_hash,password_salt,role) VALUES(?,?,?,?, 'recruiter')",
      ).bind(
        id,
        clean(body.email, 254).toLowerCase(),
        await hashPassword(body.password, salt),
        salt,
      ),
      env.DB.prepare(
        "INSERT INTO recruiter_profiles(user_id,first_name,last_name,phone,company_name,job_title,company_sector,city) VALUES(?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        clean(body.firstName, 80),
        clean(body.lastName, 80),
        String(body.phone).replace(/[\\s.-]/g, ""),
        clean(body.companyName, 160) || null,
        clean(body.jobTitle, 120) || null,
        clean(body.sector, 120) || null,
        clean(body.city, 120) || null,
      ),
    ]);
  } else if (resource === "recruiters" && request.method === "PATCH") {
    if (!validEmail(clean(body.email, 254)) || !validPhone(body.phone))
      return bad("Email ou téléphone invalide.");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE users SET email=?,account_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(
        clean(body.email, 254).toLowerCase(),
        adminAccountStatuses.has(body.status)
          ? body.status
          : before.account_status,
        id,
      ),
      env.DB.prepare(
        "UPDATE recruiter_profiles SET first_name=?,last_name=?,phone=?,company_name=?,job_title=?,company_sector=?,city=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
      ).bind(
        clean(body.firstName, 80),
        clean(body.lastName, 80),
        String(body.phone).replace(/[\\s.-]/g, ""),
        clean(body.companyName, 160) || null,
        clean(body.jobTitle, 120) || null,
        clean(body.sector, 120) || null,
        clean(body.city, 120) || null,
        id,
      ),
    ]);
  } else if (resource === "companies" && request.method === "POST") {
    if (!clean(body.name, 160) || !clean(body.ownerUserId, 80))
      return bad("Nom et recruteur propriétaire obligatoires.");
    id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO companies(id,owner_user_id,name,sector,city,website,description,status) VALUES(?,?,?,?,?,?,?,'active')",
    )
      .bind(
        id,
        clean(body.ownerUserId, 80),
        clean(body.name, 160),
        clean(body.sector, 120) || null,
        clean(body.city, 120) || null,
        clean(body.website, 240) || null,
        clean(body.description, 2000) || null,
      )
      .run();
  } else if (resource === "companies" && request.method === "PATCH") {
    await env.DB.prepare(
      "UPDATE companies SET name=?,sector=?,city=?,website=?,description=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        clean(body.name, 160),
        clean(body.sector, 120) || null,
        clean(body.city, 120) || null,
        clean(body.website, 240) || null,
        clean(body.description, 2000) || null,
        adminAccountStatuses.has(body.status) ? body.status : before.status,
        id,
      )
      .run();
  } else if (resource === "jobs" && request.method === "PATCH") {
    if (!clean(body.title, 160) || !clean(body.description, 5000))
      return bad("Titre et description obligatoires.");
    await env.DB.prepare(
      "UPDATE job_offers SET title=?,domain=?,description=?,contract_type=?,city=?,work_mode=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        clean(body.title, 160),
        clean(body.domain, 120),
        clean(body.description, 5000),
        clean(body.contractType, 80),
        clean(body.city, 120),
        clean(body.workMode, 40),
        adminJobStatuses.has(body.status) ? body.status : before.status,
        id,
      )
      .run();
  } else if (resource === "applications" && request.method === "PATCH") {
    if (!adminApplicationStatuses.has(body.status))
      return bad("Statut invalide.");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE applications SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(body.status, id),
      env.DB.prepare(
        "INSERT INTO application_status_history(id,application_id,status) VALUES(?,?,?)",
      ).bind(crypto.randomUUID(), id, body.status),
    ]);
  } else if (resource === "interviews" && request.method === "POST") {
    const application = await env.DB.prepare(
      "SELECT a.id,a.candidate_user_id,j.recruiter_user_id FROM applications a JOIN job_offers j ON j.id=a.job_offer_id WHERE a.id=?",
    )
      .bind(clean(body.applicationId, 80))
      .first();
    if (
      !application ||
      !clean(body.startsAt, 50) ||
      !["onsite", "video", "phone"].includes(body.type)
    )
      return bad("Entretien invalide.");
    id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO interviews(id,application_id,candidate_user_id,recruiter_user_id,starts_at,duration_minutes,interview_type,location,meeting_url,status) VALUES(?,?,?,?,?,?,?,?,?,'scheduled')",
    )
      .bind(
        id,
        application.id,
        application.candidate_user_id,
        application.recruiter_user_id,
        body.startsAt,
        Number(body.duration) || 60,
        body.type,
        clean(body.location, 500) || null,
        clean(body.meetingUrl, 500) || null,
      )
      .run();
  } else if (resource === "interviews" && request.method === "PATCH") {
    if (!adminInterviewStatuses.has(body.status) || !clean(body.startsAt, 50))
      return bad("Entretien invalide.");
    await env.DB.prepare(
      "UPDATE interviews SET starts_at=?,duration_minutes=?,interview_type=?,location=?,meeting_url=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        body.startsAt,
        Number(body.duration) || 60,
        ["onsite", "video", "phone"].includes(body.type)
          ? body.type
          : before.interview_type,
        clean(body.location, 500) || null,
        clean(body.meetingUrl, 500) || null,
        body.status,
        id,
      )
      .run();
  } else return bad("Action non prise en charge.", 405);
  const after =
    request.method === "DELETE" ? null : await adminSnapshot(env, resource, id);
  await adminAudit(
    env,
    session.id,
    `admin_${resource}_${action || (before ? "updated" : "created")}`,
    resource.slice(0, -1),
    id,
    before,
    after,
  );
  return json({ ok: true, id, item: after }, before ? 200 : 201);
}
async function adminBusiness(request, env, path) {
  const parts = path.split("/").filter(Boolean),
    resource = parts[3],
    id = parts[4] || null,
    action = parts[5] || null;
  if (!adminResources.has(resource))
    return bad("Module admin introuvable.", 404);
  if (request.method === "GET" && !id)
    return adminBusinessList(request, env, resource);
  if (
    request.method === "GET" &&
    resource === "candidates" &&
    id &&
    action === "export"
  )
    return adminCandidateExport(request, env, id);
  if (request.method === "GET" && id)
    return adminBusinessDetail(request, env, resource, id);
  return adminBusinessMutation(request, env, resource, id, action);
}
const faqCategories = new Set([
  "account",
  "login",
  "password",
  "candidate",
  "recruiter",
  "company",
  "cv",
  "documents",
  "jobs",
  "filters",
  "favorites",
  "alerts",
  "applications",
  "statuses",
  "matching",
  "interviews",
  "notifications",
  "privacy",
  "security",
  "languages",
  "support",
  "technical",
]);
function normalizeFaq(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function faqTokens(value) {
  const synonyms = {
    connexion: "login",
    connecter: "login",
    connection: "login",
    signin: "login",
    mdp: "password",
    passe: "password",
    mot: "password",
    emploi: "job",
    offre: "job",
    poste: "job",
    travail: "job",
    candidature: "application",
    postuler: "application",
    apply: "application",
    cv: "resume",
    السيرة: "resume",
    وظيفة: "job",
    الدخول: "login",
    كلمة: "password",
    طلب: "application",
  };
  return normalizeFaq(value)
    .split(" ")
    .filter((token) => token.length > 1)
    .map((token) => synonyms[token] || token);
}
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = old;
    }
  }
  return row[b.length];
}
function faqScore(entry, query, language) {
  const lang = ["fr", "en", "ar"].includes(language) ? language : "fr",
    qTokens = faqTokens(query),
    target = faqTokens(
      `${entry[`question_${lang}`]} ${parseStored(entry[`keywords_${lang}`], []).join(" ")}`,
    );
  if (!qTokens.length) return 0;
  let matches = 0;
  for (const token of qTokens) {
    const best = target.reduce(
      (score, candidate) =>
        Math.max(
          score,
          token === candidate
            ? 1
            : Math.max(token.length, candidate.length) >= 4 &&
                editDistance(token, candidate) <= 1
              ? 0.82
              : 0,
        ),
      0,
    );
    matches += best;
  }
  const phrase =
    normalizeFaq(entry[`question_${lang}`]).includes(normalizeFaq(query)) ||
    normalizeFaq(query).includes(normalizeFaq(entry[`question_${lang}`]))
      ? 0.18
      : 0;
  return Math.min(
    1,
    matches / Math.max(qTokens.length, 2) +
      phrase +
      Math.min(0.08, Number(entry.priority || 0) / 1250),
  );
}
async function ensureFaqSeed(env) {
  const count = await env.DB.prepare(
    "SELECT COUNT(*) count FROM faq_entries",
  ).first();
  if (Number(count?.count)) return;
  for (let offset = 0; offset < FAQ_CATALOG.length; offset += 40) {
    await env.DB.batch(
      FAQ_CATALOG.slice(offset, offset + 40).map((entry) =>
        env.DB.prepare(
          "INSERT OR IGNORE INTO faq_entries(id,category,question_fr,answer_fr,question_en,answer_en,question_ar,answer_ar,keywords_fr,keywords_en,keywords_ar,priority,is_active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).bind(
          entry.id,
          entry.category,
          entry.question_fr,
          entry.answer_fr,
          entry.question_en,
          entry.answer_en,
          entry.question_ar,
          entry.answer_ar,
          JSON.stringify(entry.keywords_fr),
          JSON.stringify(entry.keywords_en),
          JSON.stringify(entry.keywords_ar),
          entry.priority,
          entry.is_active ? 1 : 0,
        ),
      ),
    );
  }
}
function faqForJson(row) {
  return {
    ...row,
    keywords_fr: parseStored(row.keywords_fr, []),
    keywords_en: parseStored(row.keywords_en, []),
    keywords_ar: parseStored(row.keywords_ar, []),
    is_active: Boolean(row.is_active),
  };
}
async function publicFaq(request, env, path) {
  await ensureFaqSeed(env);
  if (path === "/api/faq" && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT * FROM faq_entries WHERE is_active=1 ORDER BY priority DESC,created_at",
    ).all();
    return json({ items: results.map(faqForJson) });
  }
  if (path === "/api/chatbot/ask" && request.method === "POST") {
    const platform = await getPlatformSettings(env);
    if (!platform.chatbot.enabled) return bad("Le chatbot est temporairement désactivé.", 503);
    const body = await request.json().catch(() => ({})),
      query = clean(body.query, 500),
      language = ["fr", "en", "ar"].includes(body.language)
        ? body.language
        : "fr";
    if (!query) return bad("Question obligatoire.");
    const { results = [] } = await env.DB.prepare(
        "SELECT * FROM faq_entries WHERE is_active=1",
      ).all(),
      ranked = results
        .map((entry) => ({ entry, score: faqScore(entry, query, language) }))
        .sort(
          (a, b) => b.score - a.score || b.entry.priority - a.entry.priority,
        ),
      best = ranked[0],
      matched = Boolean(best && best.score >= platform.chatbot.similarityThreshold),
      id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO chatbot_queries(id,query_text,normalized_query,language,matched,faq_id,category,score) VALUES(?,?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        query,
        normalizeFaq(query),
        language,
        matched ? 1 : 0,
        matched ? best.entry.id : null,
        matched ? best.entry.category : null,
        best?.score || 0,
      )
      .run();
    return json({
      matched,
      answer: matched ? best.entry[`answer_${language}`] : null,
      faq: matched ? faqForJson(best.entry) : null,
      suggestions: ranked
        .slice(matched ? 1 : 0, matched ? 4 : 3)
        .map((item) => ({ ...faqForJson(item.entry), score: item.score })),
      queryId: id,
    });
  }
  return bad("Action non prise en charge.", 405);
}
function faqPayload(body) {
  const value = {
    category: faqCategories.has(body.category) ? body.category : null,
    questionFr: clean(body.questionFr, 500),
    answerFr: clean(body.answerFr, 3000),
    questionEn: clean(body.questionEn, 500),
    answerEn: clean(body.answerEn, 3000),
    questionAr: clean(body.questionAr, 500),
    answerAr: clean(body.answerAr, 3000),
    keywordsFr: list(body.keywordsFr),
    keywordsEn: list(body.keywordsEn),
    keywordsAr: list(body.keywordsAr),
    priority: Math.min(
      999,
      Math.max(0, Number.parseInt(body.priority, 10) || 0),
    ),
    active: body.active !== false,
  };
  if (
    !value.category ||
    ![
      value.questionFr,
      value.answerFr,
      value.questionEn,
      value.answerEn,
      value.questionAr,
      value.answerAr,
    ].every(Boolean)
  )
    throw bad("Toutes les traductions et la catégorie sont obligatoires.");
  return value;
}
async function adminFaq(request, env, path) {
  const session = await requireAdmin(request, env);
  assertAdminOrigin(request, env);
  await ensureFaqSeed(env);
  const parts = path.split("/").filter(Boolean),
    id = parts[3] || null,
    action = parts[4] || null;
  if (!id && request.method === "GET") {
    const url = new URL(request.url),
      search = clean(url.searchParams.get("q"), 120),
      category = clean(url.searchParams.get("category"), 40),
      active = url.searchParams.get("active");
    let sql = "SELECT * FROM faq_entries WHERE 1=1",
      params = [];
    if (search) {
      sql +=
        " AND (question_fr LIKE ? OR question_en LIKE ? OR question_ar LIKE ? OR keywords_fr LIKE ? OR keywords_en LIKE ? OR keywords_ar LIKE ?)";
      params.push(...Array(6).fill(`%${search}%`));
    }
    if (faqCategories.has(category)) {
      sql += " AND category=?";
      params.push(category);
    }
    if (["0", "1"].includes(active)) {
      sql += " AND is_active=?";
      params.push(Number(active));
    }
    const { results = [] } = await env.DB.prepare(
      sql + " ORDER BY priority DESC,updated_at DESC",
    )
      .bind(...params)
      .all();
    return json({
      items: results.map(faqForJson),
      categories: [...faqCategories],
    });
  }
  if (!id && request.method === "POST") {
    const p = faqPayload(await request.json().catch(() => ({}))),
      newId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO faq_entries(id,category,question_fr,answer_fr,question_en,answer_en,question_ar,answer_ar,keywords_fr,keywords_en,keywords_ar,priority,is_active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        newId,
        p.category,
        p.questionFr,
        p.answerFr,
        p.questionEn,
        p.answerEn,
        p.questionAr,
        p.answerAr,
        JSON.stringify(p.keywordsFr),
        JSON.stringify(p.keywordsEn),
        JSON.stringify(p.keywordsAr),
        p.priority,
        p.active ? 1 : 0,
      )
      .run();
    const after = await env.DB.prepare("SELECT * FROM faq_entries WHERE id=?")
      .bind(newId)
      .first();
    await adminAudit(env, session.id, "faq_created", "faq", newId, null, after);
    return json({ id: newId }, 201);
  }
  const before = id
    ? await env.DB.prepare("SELECT * FROM faq_entries WHERE id=?")
        .bind(id)
        .first()
    : null;
  if (!before) return bad("FAQ introuvable.", 404);
  if (request.method === "PATCH" && !action) {
    const p = faqPayload(await request.json().catch(() => ({})));
    await env.DB.prepare(
      "UPDATE faq_entries SET category=?,question_fr=?,answer_fr=?,question_en=?,answer_en=?,question_ar=?,answer_ar=?,keywords_fr=?,keywords_en=?,keywords_ar=?,priority=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        p.category,
        p.questionFr,
        p.answerFr,
        p.questionEn,
        p.answerEn,
        p.questionAr,
        p.answerAr,
        JSON.stringify(p.keywordsFr),
        JSON.stringify(p.keywordsEn),
        JSON.stringify(p.keywordsAr),
        p.priority,
        p.active ? 1 : 0,
        id,
      )
      .run();
    const after = await env.DB.prepare("SELECT * FROM faq_entries WHERE id=?")
      .bind(id)
      .first();
    await adminAudit(env, session.id, "faq_updated", "faq", id, before, after);
    return json({ ok: true });
  }
  if (action === "toggle" && request.method === "POST") {
    await env.DB.prepare(
      "UPDATE faq_entries SET is_active=CASE is_active WHEN 1 THEN 0 ELSE 1 END,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(id)
      .run();
    const after = await env.DB.prepare("SELECT * FROM faq_entries WHERE id=?")
      .bind(id)
      .first();
    await adminAudit(env, session.id, "faq_toggled", "faq", id, before, after);
    return json({ ok: true });
  }
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM faq_entries WHERE id=?").bind(id).run();
    await adminAudit(env, session.id, "faq_deleted", "faq", id, before, null);
    return json({ ok: true });
  }
  return bad("Action non prise en charge.", 405);
}
async function adminChatbotAnalytics(request, env, path) {
  const session = await requireAdmin(request, env);
  assertAdminOrigin(request, env);
  if (path === "/api/admin/chatbot/analytics") {
    const [total, top, categories, languages, unknown] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) total,SUM(matched) answered FROM chatbot_queries",
      ).first(),
      env.DB.prepare(
        "SELECT f.id,f.question_fr,COUNT(*) count FROM chatbot_queries q JOIN faq_entries f ON f.id=q.faq_id WHERE q.matched=1 GROUP BY f.id ORDER BY count DESC LIMIT 10",
      ).all(),
      env.DB.prepare(
        "SELECT COALESCE(category,'unknown') category,COUNT(*) count FROM chatbot_queries GROUP BY category ORDER BY count DESC",
      ).all(),
      env.DB.prepare(
        "SELECT language,COUNT(*) count FROM chatbot_queries GROUP BY language ORDER BY count DESC",
      ).all(),
      env.DB.prepare(
        "SELECT id,query_text,language,score,created_at,converted_faq_id FROM chatbot_queries WHERE matched=0 ORDER BY created_at DESC LIMIT 100",
      ).all(),
    ]);
    return json({
      summary: {
        total: Number(total?.total) || 0,
        answered: Number(total?.answered) || 0,
        responseRate: Number(total?.total)
          ? Math.round((Number(total.answered) * 100) / Number(total.total))
          : 0,
      },
      topQuestions: top.results || [],
      categories: categories.results || [],
      languages: languages.results || [],
      unknown: unknown.results || [],
    });
  }
  const queryId = path.split("/").filter(Boolean)[4];
  if (path.endsWith("/convert") && request.method === "POST") {
    const query = await env.DB.prepare(
      "SELECT * FROM chatbot_queries WHERE id=? AND matched=0",
    )
      .bind(queryId)
      .first();
    if (!query) return bad("Question inconnue introuvable.", 404);
    const id = crypto.randomUUID(),
      fields = {
        fr: ["question_fr", "keywords_fr"],
        en: ["question_en", "keywords_en"],
        ar: ["question_ar", "keywords_ar"],
      };
    const question = { fr: "", en: "", ar: "" };
    question[query.language] = query.query_text;
    await env.DB.prepare(
      "INSERT INTO faq_entries(id,category,question_fr,answer_fr,question_en,answer_en,question_ar,answer_ar,keywords_fr,keywords_en,keywords_ar,priority,is_active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0)",
    )
      .bind(
        id,
        "support",
        question.fr || "À traduire",
        query.language === "fr" ? "À compléter" : "À traduire",
        question.en || "To translate",
        query.language === "en" ? "To complete" : "To translate",
        question.ar || "للترجمة",
        query.language === "ar" ? "يجب الإكمال" : "للترجمة",
        JSON.stringify(
          query.language === "fr" ? faqTokens(query.query_text) : [],
        ),
        JSON.stringify(
          query.language === "en" ? faqTokens(query.query_text) : [],
        ),
        JSON.stringify(
          query.language === "ar" ? faqTokens(query.query_text) : [],
        ),
        50,
      )
      .run();
    await env.DB.prepare(
      "UPDATE chatbot_queries SET converted_faq_id=? WHERE id=?",
    )
      .bind(id, queryId)
      .run();
    await adminAudit(
      env,
      session.id,
      "unknown_question_converted",
      "faq",
      id,
      null,
      { queryId },
    );
    return json({ id }, 201);
  }
  return bad("Action non prise en charge.", 405);
}

function sanitizeTemplateQuestion(body) {
  const type = questionnaireTypes.has(body.type) ? body.type : null;
  const labels = multilingual(body.labels, 500, true);
  if (!type || !labels)
    throw bad("Les trois libellés FR, EN et AR sont obligatoires.");
  let options = Array.isArray(body.options)
    ? body.options.slice(0, 50).map((option, index) => ({
        id: clean(option?.id, 80) || `option-${index + 1}`,
        fr: clean(option?.fr, 300),
        en: clean(option?.en, 300),
        ar: clean(option?.ar, 300),
      }))
    : [];
  if (["single_choice", "multiple_choice"].includes(type)) {
    options = options.filter((option) => option.fr && option.en && option.ar);
    if (options.length < 2)
      throw bad("Ajoutez au moins deux choix traduits en FR, EN et AR.");
  } else options = [];
  const validationNumber = (value) =>
    value !== "" &&
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value))
      ? Number(value)
      : null;
  const validation =
    body.validation && typeof body.validation === "object"
      ? {
          min: validationNumber(body.validation.min),
          max: validationNumber(body.validation.max),
          minLength: validationNumber(body.validation.minLength),
          maxLength: validationNumber(body.validation.maxLength),
          pattern: clean(body.validation.pattern, 200) || null,
          expectedValue: Array.isArray(body.validation.expectedValue)
            ? body.validation.expectedValue
                .slice(0, 50)
                .map((value) => clean(value, 300))
                .filter(Boolean)
            : ["string", "number", "boolean"].includes(
                  typeof body.validation.expectedValue,
                )
              ? body.validation.expectedValue
              : null,
        }
      : {};
  const condition =
    body.condition &&
    typeof body.condition === "object" &&
    clean(body.condition.questionId, 80)
      ? {
          questionId: clean(body.condition.questionId, 80),
          operator: ["equals", "not_equals", "contains", "in"].includes(
            body.condition.operator,
          )
            ? body.condition.operator
            : "equals",
          value: body.condition.value ?? "",
        }
      : {};
  return {
    labels,
    description: multilingual(body.description, 1000) || {
      fr: "",
      en: "",
      ar: "",
    },
    help: multilingual(body.help, 500) || { fr: "", en: "", ar: "" },
    placeholder: multilingual(body.placeholder, 300) || {
      fr: "",
      en: "",
      ar: "",
    },
    type,
    options,
    required: body.required ? 1 : 0,
    weight: Math.min(100, Math.max(0, Number(body.weight) || 0)),
    eliminatory: body.eliminatory ? 1 : 0,
    validation,
    condition,
    sortOrder: Math.max(0, Number.parseInt(body.sortOrder, 10) || 0),
  };
}
async function adminTemplateSnapshot(env, id) {
  const template = await env.DB.prepare(
    "SELECT * FROM admin_questionnaire_templates WHERE id=?",
  )
    .bind(id)
    .first();
  if (!template) return null;
  const { results = [] } = await env.DB.prepare(
    "SELECT * FROM admin_template_questions WHERE template_id=? ORDER BY sort_order,created_at",
  )
    .bind(id)
    .all();
  return { template, questions: results };
}
function parsedQuestion(row) {
  return {
    ...row,
    labels: parseStored(row.label_json, {}),
    description: parseStored(row.description_json, {}),
    help: parseStored(row.help_json, {}),
    placeholder: parseStored(row.placeholder_json, {}),
    options: parseStored(row.options_json, []),
    validation: parseStored(row.validation_json, {}),
    condition: parseStored(row.condition_json, {}),
  };
}
async function adminQuestionnaireBuilder(request, env, path) {
  const session = await requireAdmin(request, env);
  assertAdminOrigin(request, env);
  const parts = path.split("/").filter(Boolean),
    templateId = parts[3] || null,
    section = parts[4] || null,
    childId = parts[5] || null;
  if (!templateId && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT t.*,(SELECT COUNT(*) FROM admin_template_questions q WHERE q.template_id=t.id) question_count,(SELECT COUNT(*) FROM recruiter_questionnaires rq WHERE rq.source_template_id=t.id) usage_count FROM admin_questionnaire_templates t ORDER BY CASE t.template_kind WHEN 'general' THEN 1 WHEN 'sales' THEN 2 WHEN 'it' THEN 3 WHEN 'logistics' THEN 4 WHEN 'management' THEN 5 ELSE 6 END,t.updated_at DESC",
    ).all();
    return json({ items: results });
  }
  if (!templateId && request.method === "POST") {
    const body = await request.json().catch(() => ({})),
      name = clean(body.name, 160);
    if (!name) return bad("Le nom est obligatoire.");
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO admin_questionnaire_templates(id,name,description,template_kind,creator_label,status,is_recruiter_available) VALUES(?,?,?,?,?,'draft',?)",
    )
      .bind(
        id,
        name,
        clean(body.description, 1000) || null,
        [
          "general",
          "sales",
          "it",
          "logistics",
          "management",
          "custom",
        ].includes(body.templateKind)
          ? body.templateKind
          : "custom",
        "Administrateur",
        body.recruiterAvailable ? 1 : 0,
      )
      .run();
    const after = await adminTemplateSnapshot(env, id);
    await adminAudit(
      env,
      session.id,
      "questionnaire_template_created",
      "questionnaire_template",
      id,
      null,
      after,
    );
    return json({ id, item: after }, 201);
  }
  const before = await adminTemplateSnapshot(env, templateId);
  if (!before) return bad("Questionnaire introuvable.", 404);
  if (!section && request.method === "GET")
    return json({
      item: before.template,
      questions: before.questions.map(parsedQuestion),
    });
  if (!section && request.method === "PATCH") {
    const body = await request.json().catch(() => ({})),
      name = clean(body.name, 160);
    if (!name) return bad("Le nom est obligatoire.");
    await env.DB.prepare(
      "UPDATE admin_questionnaire_templates SET name=?,description=?,template_kind=?,status=?,is_recruiter_available=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        name,
        clean(body.description, 1000) || null,
        [
          "general",
          "sales",
          "it",
          "logistics",
          "management",
          "custom",
        ].includes(body.templateKind)
          ? body.templateKind
          : before.template.template_kind,
        ["draft", "active", "archived"].includes(body.status)
          ? body.status
          : before.template.status,
        body.recruiterAvailable ? 1 : 0,
        templateId,
      )
      .run();
    const after = await adminTemplateSnapshot(env, templateId);
    await adminAudit(
      env,
      session.id,
      "questionnaire_template_updated",
      "questionnaire_template",
      templateId,
      before,
      after,
    );
    return json({ ok: true });
  }
  if (!section && request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM admin_questionnaire_templates WHERE id=?")
      .bind(templateId)
      .run();
    await adminAudit(
      env,
      session.id,
      "questionnaire_template_deleted",
      "questionnaire_template",
      templateId,
      before,
      null,
    );
    return json({ ok: true });
  }
  if (["archive", "activate"].includes(section) && request.method === "POST") {
    await env.DB.prepare(
      "UPDATE admin_questionnaire_templates SET status=?,is_recruiter_available=CASE WHEN ?='active' THEN is_recruiter_available ELSE 0 END,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        section === "activate" ? "active" : "archived",
        section === "activate" ? "active" : "archived",
        templateId,
      )
      .run();
    const after = await adminTemplateSnapshot(env, templateId);
    await adminAudit(
      env,
      session.id,
      `questionnaire_template_${section}d`,
      "questionnaire_template",
      templateId,
      before,
      after,
    );
    return json({ ok: true });
  }
  if (section === "duplicate" && request.method === "POST") {
    const body = await request.json().catch(() => ({})),
      newId = crypto.randomUUID(),
      map = new Map(before.questions.map((q) => [q.id, crypto.randomUUID()]));
    const statements = [
      env.DB.prepare(
        "INSERT INTO admin_questionnaire_templates(id,name,description,template_kind,creator_label,status,is_recruiter_available) VALUES(?,?,?,?,?,'draft',0)",
      ).bind(
        newId,
        clean(body.name, 160) || `${before.template.name} - Copie`,
        before.template.description,
        before.template.template_kind,
        "Administrateur",
      ),
    ];
    for (const q of before.questions) {
      const condition = parseStored(q.condition_json, {});
      if (condition.questionId && map.has(condition.questionId))
        condition.questionId = map.get(condition.questionId);
      statements.push(
        env.DB.prepare(
          "INSERT INTO admin_template_questions(id,template_id,label_json,description_json,help_json,placeholder_json,question_type,options_json,is_required,weight,is_eliminatory,validation_json,condition_json,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).bind(
          map.get(q.id),
          newId,
          q.label_json,
          q.description_json,
          q.help_json,
          q.placeholder_json,
          q.question_type,
          q.options_json,
          q.is_required,
          q.weight,
          q.is_eliminatory,
          q.validation_json,
          JSON.stringify(condition),
          q.sort_order,
        ),
      );
    }
    await env.DB.batch(statements);
    const after = await adminTemplateSnapshot(env, newId);
    await adminAudit(
      env,
      session.id,
      "questionnaire_template_duplicated",
      "questionnaire_template",
      newId,
      null,
      after,
      { sourceId: templateId },
    );
    return json({ id: newId }, 201);
  }
  if (section === "reorder" && request.method === "PATCH") {
    const body = await request.json().catch(() => ({})),
      ids = Array.isArray(body.ids)
        ? body.ids.map((x) => clean(x, 80)).filter(Boolean)
        : [];
    if (
      ids.length !== before.questions.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !before.questions.some((q) => q.id === id))
    )
      return bad("Ordre invalide.");
    await env.DB.batch(
      ids.map((id, index) =>
        env.DB.prepare(
          "UPDATE admin_template_questions SET sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND template_id=?",
        ).bind((index + 1) * 10, id, templateId),
      ),
    );
    await env.DB.prepare(
      "UPDATE admin_questionnaire_templates SET updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(templateId)
      .run();
    const after = await adminTemplateSnapshot(env, templateId);
    await adminAudit(
      env,
      session.id,
      "questionnaire_questions_reordered",
      "questionnaire_template",
      templateId,
      before,
      after,
    );
    return json({ ok: true });
  }
  if (section === "questions" && !childId && request.method === "POST") {
    const body = await request.json().catch(() => ({})),
      q = sanitizeTemplateQuestion(body),
      id = crypto.randomUUID();
    if (
      q.condition.questionId &&
      !before.questions.some((x) => x.id === q.condition.questionId)
    )
      return bad("Question conditionnelle source invalide.");
    const order =
      q.sortOrder || (before.questions.at(-1)?.sort_order || 0) + 10;
    await env.DB.prepare(
      "INSERT INTO admin_template_questions(id,template_id,label_json,description_json,help_json,placeholder_json,question_type,options_json,is_required,weight,is_eliminatory,validation_json,condition_json,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        templateId,
        JSON.stringify(q.labels),
        JSON.stringify(q.description),
        JSON.stringify(q.help),
        JSON.stringify(q.placeholder),
        q.type,
        JSON.stringify(q.options),
        q.required,
        q.weight,
        q.eliminatory,
        JSON.stringify(q.validation),
        JSON.stringify(q.condition),
        order,
      )
      .run();
    await env.DB.prepare(
      "UPDATE admin_questionnaire_templates SET updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(templateId)
      .run();
    const after = await adminTemplateSnapshot(env, templateId);
    await adminAudit(
      env,
      session.id,
      "questionnaire_question_created",
      "questionnaire_template",
      templateId,
      before,
      after,
      { questionId: id },
    );
    return json({ id }, 201);
  }
  if (section === "questions" && childId && request.method === "PATCH") {
    const body = await request.json().catch(() => ({})),
      q = sanitizeTemplateQuestion(body);
    if (!before.questions.some((x) => x.id === childId))
      return bad("Question introuvable.", 404);
    if (
      q.condition.questionId &&
      (q.condition.questionId === childId ||
        !before.questions.some((x) => x.id === q.condition.questionId))
    )
      return bad("Condition invalide.");
    await env.DB.prepare(
      "UPDATE admin_template_questions SET label_json=?,description_json=?,help_json=?,placeholder_json=?,question_type=?,options_json=?,is_required=?,weight=?,is_eliminatory=?,validation_json=?,condition_json=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND template_id=?",
    )
      .bind(
        JSON.stringify(q.labels),
        JSON.stringify(q.description),
        JSON.stringify(q.help),
        JSON.stringify(q.placeholder),
        q.type,
        JSON.stringify(q.options),
        q.required,
        q.weight,
        q.eliminatory,
        JSON.stringify(q.validation),
        JSON.stringify(q.condition),
        q.sortOrder || 10,
        childId,
        templateId,
      )
      .run();
    await env.DB.prepare(
      "UPDATE admin_questionnaire_templates SET updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(templateId)
      .run();
    const after = await adminTemplateSnapshot(env, templateId);
    await adminAudit(
      env,
      session.id,
      "questionnaire_question_updated",
      "questionnaire_template",
      templateId,
      before,
      after,
      { questionId: childId },
    );
    return json({ ok: true });
  }
  if (section === "questions" && childId && request.method === "DELETE") {
    if (!before.questions.some((x) => x.id === childId))
      return bad("Question introuvable.", 404);
    if (
      before.questions.some(
        (q) => parseStored(q.condition_json, {}).questionId === childId,
      )
    )
      return bad("Supprimez d’abord les conditions dépendantes.", 409);
    await env.DB.prepare(
      "DELETE FROM admin_template_questions WHERE id=? AND template_id=?",
    )
      .bind(childId, templateId)
      .run();
    await env.DB.prepare(
      "UPDATE admin_questionnaire_templates SET updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(templateId)
      .run();
    const after = await adminTemplateSnapshot(env, templateId);
    await adminAudit(
      env,
      session.id,
      "questionnaire_question_deleted",
      "questionnaire_template",
      templateId,
      before,
      after,
      { questionId: childId },
    );
    return json({ ok: true });
  }
  return bad("Action non prise en charge.", 405);
}
async function adminQuestionnaire(request, env, path) {
  const user = await requireAdmin(request, env);
  if (request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT id,field_key,type,labels_json,description_json,options_json,sort_order,is_required,is_active FROM questionnaire_questions ORDER BY sort_order",
    ).all();
    return json({
      items: results.map((row) => ({
        ...row,
        labels: parseStored(row.labels_json, {}),
        options: parseStored(row.options_json, []),
      })),
    });
  }
  const body = await request.json().catch(() => null);
  if (!body) return bad("Données invalides.");
  if (path === "/api/admin/questionnaire" && request.method === "POST") {
    const field = clean(body.fieldKey, 80)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_"),
      label = clean(body.label, 160),
      type = ["text", "textarea", "number", "select", "multiselect"].includes(
        body.type,
      )
        ? body.type
        : null,
      options = list(body.options);
    if (
      !field ||
      !label ||
      !type ||
      (["select", "multiselect"].includes(type) && !options.length)
    )
      return bad("Veuillez renseigner une question valide.");
    const id = crypto.randomUUID(),
      last = await env.DB.prepare(
        "SELECT COALESCE(MAX(sort_order),0) max_sort FROM questionnaire_questions",
      ).first();
    await env.DB.prepare(
      "INSERT INTO questionnaire_questions(id,field_key,type,labels_json,options_json,sort_order,is_required,is_active) VALUES(?,?,?,?,?,?,?,1)",
    )
      .bind(
        id,
        field,
        type,
        JSON.stringify({
          fr: label,
          en: clean(body.labelEn, 160) || label,
          ar: clean(body.labelAr, 160) || label,
        }),
        JSON.stringify(options),
        (last.max_sort || 0) + 10,
        body.required ? 1 : 0,
      )
      .run();
    await adminAudit(
      env,
      user.id,
      "question_created",
      "questionnaire_question",
      id,
    );
    return json({ id }, 201);
  }
  const id = path.split("/").pop();
  if (request.method === "PATCH") {
    const label = clean(body.label, 160),
      options = Array.isArray(body.options) ? list(body.options) : null;
    await env.DB.prepare(
      "UPDATE questionnaire_questions SET labels_json=COALESCE(?,labels_json),options_json=COALESCE(?,options_json),sort_order=COALESCE(?,sort_order),is_required=COALESCE(?,is_required),is_active=COALESCE(?,is_active) WHERE id=?",
    )
      .bind(
        label
          ? JSON.stringify({
              fr: label,
              en: clean(body.labelEn, 160) || label,
              ar: clean(body.labelAr, 160) || label,
            })
          : null,
        options ? JSON.stringify(options) : null,
        Number.isInteger(body.sortOrder) ? body.sortOrder : null,
        typeof body.required === "boolean" ? (body.required ? 1 : 0) : null,
        typeof body.active === "boolean" ? (body.active ? 1 : 0) : null,
        id,
      )
      .run();
    return json({ ok: true });
  }
  if (request.method === "DELETE") {
    await env.DB.prepare(
      "UPDATE questionnaire_questions SET is_active=0 WHERE id=?",
    )
      .bind(id)
      .run();
    return new Response(null, { status: 204 });
  }
  return bad("Action non prise en charge.", 405);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const suppliedRequestId = request.headers.get("x-request-id");
    const requestId = suppliedRequestId && /^[a-zA-Z0-9_-]{8,80}$/.test(suppliedRequestId) ? suppliedRequestId : crypto.randomUUID();
    if (request.method === "OPTIONS")
      return new Response(null, { headers: cors(request) });
    try {
      let response;
      const isAdminPath = path.startsWith("/api/admin/");
      const publicConfigPath = path === "/api/public/config" || path.startsWith("/api/public/brand/");
      if (!isAdminPath && !publicConfigPath && path.startsWith("/api/")) {
        const platform = await getPlatformSettings(env);
        if (platform.maintenance.enabled)
          response = json({ code: "MAINTENANCE", userMessage: platform.maintenance.message.fr }, 503);
      }
      if (response) {}
      else if (publicConfigPath || path === "/api/admin/platform-settings" || path.startsWith("/api/admin/platform-settings/"))
        response = await platformSettingsApi(request, env, path);
      else if (path === "/api/public/stats") response = await publicStats(env);
      else if (path === "/api/faq" || path === "/api/chatbot/ask")
        response = await publicFaq(request, env, path);
      else if (path === "/api/auth/register" && request.method === "POST")
        response = await register(request, env);
      else if (path === "/api/auth/login" && request.method === "POST")
        response = await login(request, env);
      else if (path === "/api/auth/logout" && request.method === "POST") {
        const currentUser = await userFor(request, env);
        const raw = sessionToken(request);
        if (raw)
          await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
            .bind(await digest(raw + env.SESSION_PEPPER))
            .run();
        if (currentUser)
          await platformEvent(
            env,
            "USER_LOGOUT",
            currentUser.role === "candidate" ? "candidates" : "recruiters",
            currentUser.id,
            "user",
            currentUser.id,
            { role: currentUser.role },
          );
        response = json({ ok: true }, 200, {
          "set-cookie": cookie("wc_session", ""),
        });
      } else if (path === "/api/auth/me") response = await me(request, env);
      else if (
        path === "/api/auth/forgot-password" &&
        request.method === "POST"
      )
        response = await authAction(request, env, "reset_password");
      else if (
        path === "/api/auth/resend-verification" &&
        request.method === "POST"
      )
        response = await authAction(request, env, "verify_email");
      else if (
        path === "/api/auth/change-password" &&
        request.method === "POST"
      )
        response = await security(request, env);
      else if (path === "/api/questionnaire")
        response = await questionnaire(env);
      else if (path === "/api/profile" && request.method === "PATCH")
        response = await updateProfile(request, env);
      else if (path === "/api/candidate/overview")
        response = await overview(request, env);
      else if (path === "/api/candidate/stats")
        response = await candidateStats(request, env);
      else if (path === "/api/candidate/settings")
        response = await settings(request, env);
      else if (path === "/api/recruiter/overview")
        response = await recruiterOverview(request, env);
      else if (
        path === "/api/recruiter/jobs" ||
        path.startsWith("/api/recruiter/jobs/")
      )
        response = await recruiterOffer(request, env, path);
      else if (
        path === "/api/recruiter/questionnaires" ||
        path.match(/^\/api\/recruiter\/questionnaires\/[^/]+$/)
      )
        response = await recruiterQuestionnaires(request, env, path);
      else if (
        path.match(
          /^\/api\/recruiter\/questionnaires\/[^/]+\/questions(?:\/[^/]+)?$/,
        )
      )
        response = await recruiterQuestions(request, env, path);
      else if (
        path === "/api/recruiter/applications" ||
        path.match(/^\/api\/recruiter\/applications\/[^/]+$/)
      )
        response = await recruiterApplications(request, env, path);
      else if (path.match(/^\/api\/recruiter\/applications\/[^/]+\/notes$/))
        response = await recruiterNotes(request, env, path);
      else if (
        path === "/api/recruiter/candidates" ||
        path.startsWith("/api/recruiter/candidates/")
      )
        response = await recruiterCandidates(request, env, path);
      else if (path.match(/^\/api\/recruiter\/documents\/[^/]+\/download$/))
        response = await recruiterDocument(request, env, path);
      else if (
        path === "/api/recruiter/interviews" ||
        path.startsWith("/api/recruiter/interviews/")
      )
        response = await recruiterInterviews(request, env, path);
      else if (path === "/api/recruiter/company")
        response = await recruiterCompany(request, env);
      else if (path === "/api/recruiter/settings")
        response = await recruiterSettings(request, env);
      else if (path === "/api/documents" || path.startsWith("/api/documents/"))
        response = await documents(request, env, path);
      else if (
        path === "/api/notifications" ||
        path.startsWith("/api/notifications/")
      )
        response = await notifications(request, env, path);
      else if (
        path === "/api/saved-jobs" ||
        path.startsWith("/api/saved-jobs/")
      )
        response = await savedJobs(request, env, path);
      else if (
        path === "/api/job-alerts" ||
        path.startsWith("/api/job-alerts/")
      )
        response = await alerts(request, env, path);
      else if (path === "/api/jobs" || path.startsWith("/api/jobs/"))
        response = await jobs(request, env, path);
      else if (
        path === "/api/applications" ||
        path.startsWith("/api/applications/")
      )
        response = await applications(request, env, path);
      else if (
        path === "/api/interviews" ||
        path.startsWith("/api/interviews/")
      )
        response = await interviews(request, env, path);
      else if (path === "/api/admin/auth/step-1" && request.method === "POST")
        response = await adminAuthStepOne(request, env);
      else if (path === "/api/admin/auth/step-2" && request.method === "POST")
        response = await adminAuthStepTwo(request, env);
      else if (path === "/api/admin/auth/me" && request.method === "GET")
        response = await adminMe(request, env);
      else if (path === "/api/admin/auth/logout" && request.method === "POST")
        response = await adminLogout(request, env);
      else if (
        path === "/api/admin/security/secret-change/request" &&
        request.method === "POST"
      )
        response = await requestAdminSecretChange(request, env);
      else if (
        path === "/api/admin/security/secret-change/confirm" &&
        request.method === "POST"
      )
        response = await confirmAdminSecretChange(request, env);
      else if (
        path === "/api/admin/security/email-change/request" &&
        request.method === "POST"
      )
        response = await requestAdminEmailChange(request, env);
      else if (
        path === "/api/admin/security/email-change/confirm" &&
        request.method === "POST"
      )
        response = await confirmAdminEmailChange(request, env);
      else if (
        path === "/api/admin/security/email-test" &&
        request.method === "POST"
      )
        response = await adminEmailTest(request, env);
      else if (
        path === "/api/admin/email-settings" ||
        path.startsWith("/api/admin/email-settings/")
      )
        response = await adminEmailSettings(request, env, path);
      else if (path === "/api/admin/errors" || path.startsWith("/api/admin/errors/"))
        response = await adminErrors(request, env, path);
      else if (path === "/api/errors/report" && request.method === "POST")
        response = await reportFrontendError(request, env, requestId);
      else if (env.ENVIRONMENT === "test" && path === "/api/test/errors/500")
        throw new Error("SIMULATED_INTERNAL_FAILURE");
      else if (env.ENVIRONMENT === "test" && path === "/api/test/errors/database")
        await env.DB.prepare("SELECT * FROM table_that_does_not_exist").all();
      else if (env.ENVIRONMENT === "test" && path === "/api/test/errors/upload")
        response = bad("Le stockage du document est temporairement indisponible.", 507);
      else if (env.ENVIRONMENT === "test" && path === "/api/test/errors/email")
        response = bad("Le service email est temporairement indisponible.", 503);
      else if (
        path === "/api/admin/notifications" ||
        path.startsWith("/api/admin/notifications/")
      )
        response = await adminNotifications(request, env, path);
      else if (path === "/api/admin/audit" && request.method === "GET")
        response = await adminAuditList(request, env);
      else if (path === "/api/admin/search" && request.method === "GET")
        response = await adminSearch(request, env);
      else if (path === "/api/admin/stats")
        response = await adminStats(request, env);
      else if (path === "/api/admin/dashboard" && request.method === "GET")
        response = await adminDashboard(request, env);
      else if (
        path === "/api/admin/business" ||
        path.startsWith("/api/admin/business/")
      )
        response = await adminBusiness(request, env, path);
      else if (path === "/api/admin/faq" || path.startsWith("/api/admin/faq/"))
        response = await adminFaq(request, env, path);
      else if (
        path === "/api/admin/chatbot/analytics" ||
        path.startsWith("/api/admin/chatbot/unknown/")
      )
        response = await adminChatbotAnalytics(request, env, path);
      else if (
        path === "/api/admin/questionnaires" ||
        path.startsWith("/api/admin/questionnaires/")
      )
        response = await adminQuestionnaireBuilder(request, env, path);
      else if (
        path === "/api/admin/questionnaire" ||
        path.startsWith("/api/admin/questionnaire/")
      )
        response = await adminQuestionnaire(request, env, path);
      else response = await env.ASSETS.fetch(request);
      if (path.startsWith("/api/")) response = await normalizeApiError(response, env, request, path, requestId);
      const headers = new Headers(response.headers);
      Object.entries(cors(request)).forEach(([key, value]) =>
        headers.set(key, value),
      );
      headers.set("x-content-type-options", "nosniff");
      headers.set("referrer-policy", "strict-origin-when-cross-origin");
      headers.set(
        "permissions-policy",
        "camera=(), microphone=(), geolocation=()",
      );
      if (path.startsWith("/api/admin/"))
        headers.set("cache-control", "no-store");
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      if (error instanceof Response) {
        const normalized = path.startsWith("/api/") ? await normalizeApiError(error, env, request, path, requestId) : error;
        const headers = new Headers(normalized.headers);
        Object.entries(cors(request)).forEach(([key, value]) =>
          headers.set(key, value),
        );
        headers.set("cache-control", "no-store");
        return new Response(normalized.body, { status: normalized.status, headers });
      }
      const classified = classifyError(500, String(error), path);
      try {
        await recordAppError(env,{requestId,severity:"critical",service:String(error).toLowerCase().includes("d1")||String(error).toLowerCase().includes("database")?"database":classified.service,code:classified.code,userMessage:classified.userMessage,technicalMessage:String(error),route:path,method:request.method,httpStatus:500,metadata:{environment:env.ENVIRONMENT||"unknown"}});
        await adminNotice(env,"errors","Erreur critique détectée",`Une erreur ${classified.code} est survenue. Référence : ${requestId.split("-")[0].toUpperCase()}.`,"critical","/admin/erreurs/");
        await platformEvent(
          env,
          "SYSTEM_ERROR",
          "errors",
          null,
          "route",
          path,
          {
            method: request.method,
          },
        );
      } catch {}
      try {
        await enqueueAdminEmail(env, "critical_error", "route", crypto.randomUUID());
      } catch {}
      console.error(
        JSON.stringify({
          event: "api_error",
          path,
          error: String(error),
          stack: error?.stack,
        }),
      );
      const failure = json({code:"INTERNAL_ERROR",userMessage:"Un problème technique est survenu. Réessayez dans quelques instants.",requestId,timestamp:new Date().toISOString()},500,{"x-request-id":requestId});
      const headers = new Headers(failure.headers);Object.entries(cors(request)).forEach(([key,value])=>headers.set(key,value));
      return new Response(failure.body,{status:500,headers});
    }
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(processAdminEmailOutbox(env, 25));
    ctx.waitUntil(env.DB.prepare("UPDATE job_offers SET status='closed',updated_at=CURRENT_TIMESTAMP WHERE status='published' AND deadline_at IS NOT NULL AND deadline_at<CURRENT_TIMESTAMP").run());
  },
};
