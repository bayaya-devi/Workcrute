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
    "SELECT u.id,u.email,u.role,u.email_verified_at,s.id session_id,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
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
  if (!env.EMAIL_PROVIDER_API_KEY || !env.EMAIL_FROM) return false;
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
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users(id,email,password_hash,password_salt,role) VALUES(?,?,?,?,?)",
    ).bind(id, email, hash, salt, role),
    role === "candidate"
      ? env.DB.prepare(
          "INSERT INTO candidate_profiles(user_id,first_name,last_name,phone,preferred_language) VALUES(?,?,?,?,?)",
        ).bind(
          id,
          first,
          last,
          phone,
          ["fr", "en", "ar"].includes(body.language) ? body.language : "fr",
        )
      : env.DB.prepare(
          "INSERT INTO recruiter_profiles(user_id,first_name,last_name,phone,company_name,job_title) VALUES(?,?,?,?,?,?)",
        ).bind(
          id,
          first,
          last,
          phone,
          clean(body.companyName, 120) || null,
          clean(body.jobTitle, 120) || null,
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
  const verify = await emailToken(env, id, "verify_email");
  await sendEmail(env, { to: email, template: "verify_email", token: verify });
  const session = await createSession(env, id);
  return json(
    { user: { id, email, role }, emailVerificationPending: true },
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
  const hash = await hashPassword(body.password, user.password_salt);
  if (hash !== user.password_hash) return bad("Identifiants invalides.", 401);
  const session = await createSession(env, user.id);
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
  for (let offset = 0, index = 0; offset < bytes.length; offset += chunkSize, index += 1)
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
  ).bind(documentId).all();
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
    if (!(file instanceof File) || !documentKinds.includes(kind))
      return bad("Document invalide.");
    const ext = fileTypes.get(file.type);
    if (
      !ext ||
      !file.size ||
      file.size > 8 * 1024 * 1024 ||
      !file.name.toLowerCase().endsWith("." + ext)
    )
      return bad("Le document doit être un PDF, DOC ou DOCX de moins de 8 Mo.");
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
      throw error;
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
        " FROM job_offers j LEFT JOIN companies c ON c.id=j.company_id WHERE j.status='published'",
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
    return job
      ? json({ job, matchingScore: null })
      : bad("Offre introuvable.", 404);
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
        "SELECT id,recruiter_user_id,title FROM job_offers WHERE id=? AND status='published'",
      )
        .bind(jobId)
        .first();
    if (!job) return bad("Offre introuvable.", 404);
    try {
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO applications(id,job_offer_id,candidate_user_id,cover_letter) VALUES(?,?,?,?)",
        ).bind(id, jobId, user.id, clean(body.coverLetter, 3000) || null),
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
      return json({ application: { id, status: "submitted" } }, 201);
    } catch (error) {
      if (String(error).includes("UNIQUE"))
        return bad("Vous avez déjà postulé à cette offre.", 409);
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
    const { results = [] } = await env.DB.prepare(
      "SELECT status,created_at FROM application_status_history WHERE application_id=? ORDER BY created_at",
    )
      .bind(id)
      .all();
    return json({ application, timeline: results });
  }
  if (request.method === "PATCH") {
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
    await env.DB.prepare(
      "UPDATE job_offers SET status='published',published_at=COALESCE(published_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(id)
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
  if (
    status === "published" &&
    (!title || !domain || !description || !contract || !city || !mode)
  )
    return bad("Complétez les champs obligatoires avant publication.");
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
  return json({ job: { id, status } }, 201);
}
async function recruiterQuestionnaires(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]);
  if (path === "/api/recruiter/questionnaires" && request.method === "GET") {
    const { results = [] } = await env.DB.prepare(
      "SELECT q.*,COUNT(qq.id) question_count,(SELECT COUNT(*) FROM job_offers j WHERE j.questionnaire_id=q.id) usage_count FROM recruiter_questionnaires q LEFT JOIN recruiter_questions qq ON qq.questionnaire_id=q.id WHERE q.recruiter_user_id=? GROUP BY q.id ORDER BY q.updated_at DESC",
    )
      .bind(user.id)
      .all();
    return json({ items: results });
  }
  if (path === "/api/recruiter/questionnaires" && request.method === "POST") {
    const body = await request.json().catch(() => ({})),
      name = clean(body.name, 160);
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
      "INSERT INTO recruiter_questions(id,questionnaire_id,label_json,help_json,question_type,options_json,is_required,weight,is_eliminatory,condition_json,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
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
function matching(job, candidate) {
  const jobSkills = parseStored(job.required_skills, []).map((x) =>
      String(x).toLowerCase(),
    ),
    skills = parseStored(candidate.skills_json, []).map((x) =>
      String(x).toLowerCase(),
    ),
    breakdown = [],
    push = (key, score, weight) => breakdown.push({ key, score, weight });
  if (jobSkills.length && skills.length) {
    const hits = jobSkills.filter((x) =>
      skills.some((y) => y.includes(x) || x.includes(y)),
    ).length;
    push("skills", Math.round((hits / jobSkills.length) * 100), 45);
  }
  const jobCity = job.job_city || job.city;
  const candidateCity = candidate.candidate_city || candidate.city;
  if (jobCity && candidateCity)
    push(
      "location",
      jobCity.toLowerCase() === candidateCity.toLowerCase() ? 100 : 35,
      20,
    );
  if (job.experience_level && parseStored(candidate.experience_json, []).length)
    push("experience", 70, 15);
  if (job.education_level && parseStored(candidate.education_json, []).length)
    push("education", 70, 10);
  if (candidate.availability) push("availability", 100, 10);
  if (breakdown.length < 2) return { score: null, breakdown: [] };
  const total = breakdown.reduce((sum, x) => sum + x.weight, 0),
    score = Math.round(
      breakdown.reduce((sum, x) => sum + x.score * x.weight, 0) / total,
    );
  return { score, breakdown };
}
async function recruiterApplications(request, env, path) {
  const user = await requireUser(request, env, ["recruiter"]);
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
            "SELECT id,label_json,question_type FROM recruiter_questions WHERE questionnaire_id=? ORDER BY sort_order,created_at",
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
        questions,
        answers: parseStored(application.questionnaire_answers_json, {}),
      },
      matching: matching(application, application),
    });
  }
  if (request.method === "PATCH") {
    const body = await request.json().catch(() => ({})),
      status = applicationStatuses.includes(body.status) ? body.status : null;
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
      application = await env.DB.prepare(
        "SELECT a.id,a.candidate_user_id,j.title FROM applications a JOIN job_offers j ON j.id=a.job_offer_id WHERE a.id=? AND j.recruiter_user_id=?",
      )
        .bind(clean(body.applicationId, 80), user.id)
        .first();
    if (
      !application ||
      !clean(body.startsAt, 50) ||
      !["onsite", "video", "phone"].includes(body.type)
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
        Number(body.duration) || 60,
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
    await env.DB.prepare(
      "UPDATE interviews SET starts_at=COALESCE(?,starts_at),duration_minutes=COALESCE(?,duration_minutes),interview_type=COALESCE(?,interview_type),location=COALESCE(?,location),meeting_url=COALESCE(?,meeting_url),status=COALESCE(?,status),updated_at=CURRENT_TIMESTAMP WHERE id=? AND recruiter_user_id=?",
    )
      .bind(
        clean(body.startsAt, 50) || null,
        Number(body.duration) || null,
        ["onsite", "video", "phone"].includes(body.type) ? body.type : null,
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
const afterMs = (milliseconds) => new Date(Date.now() + milliseconds).toISOString();
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
  return env.DB.prepare("SELECT * FROM admin_security_config WHERE id=1").first();
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
    ? await adminSecretHash(candidate, config[`secret_${level}_salt`], env, level)
    : await digest(candidate + context);
  return safeEqual(actual, expected);
}
async function adminIpHash(request, env) {
  const forwarded = request.headers.get("cf-connecting-ip") ||
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
async function adminAudit(env, sessionId, action, type, id, before, after, metadata = {}) {
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
}
async function adminNotice(env, category, title, body, severity = "info", href = null) {
  await env.DB.prepare(
    "INSERT INTO admin_notifications(id,category,title,body,severity,href) VALUES(?,?,?,?,?,?)",
  )
    .bind(crypto.randomUUID(), category, title, body, severity, href)
    .run();
}
async function adminRateState(env, bucketKey) {
  const row = await env.DB.prepare(
    "SELECT * FROM admin_rate_limits WHERE bucket_key=?",
  ).bind(bucketKey).first();
  if (!row) return null;
  if (row.blocked_until && row.blocked_until > now()) return row;
  if (dbTime(row.window_started_at) < Date.now() - 15 * 60 * 1000) {
    await env.DB.prepare("DELETE FROM admin_rate_limits WHERE bucket_key=?")
      .bind(bucketKey).run();
    return null;
  }
  return row;
}
async function assertAdminRate(env, bucketKey) {
  const row = await adminRateState(env, bucketKey);
  if (row?.blocked_until && row.blocked_until > now()) {
    const retry = Math.max(1, Math.ceil((new Date(row.blocked_until) - Date.now()) / 1000));
    throw json({ error: "Trop de tentatives. Réessayez plus tard.", retryAfter: retry }, 429, {
      "retry-after": String(retry),
    });
  }
}
async function adminRateFailure(env, bucketKey) {
  const row = await adminRateState(env, bucketKey);
  const count = (row?.failure_count || 0) + 1;
  const blockedUntil = count >= 5 ? afterMs(15 * 60 * 1000) : null;
  await env.DB.prepare(
    "INSERT INTO admin_rate_limits(bucket_key,failure_count,window_started_at,blocked_until,updated_at) VALUES(?,?,CURRENT_TIMESTAMP,?,CURRENT_TIMESTAMP) ON CONFLICT(bucket_key) DO UPDATE SET failure_count=?,blocked_until=?,updated_at=CURRENT_TIMESTAMP",
  ).bind(bucketKey, count, blockedUntil, count, blockedUntil).run();
  return blockedUntil;
}
async function logAdminAttempt(env, ipHash, step, success, outcome) {
  await env.DB.prepare(
    "INSERT INTO admin_login_attempts(id,ip_hash,step,success,outcome) VALUES(?,?,?,?,?)",
  ).bind(crypto.randomUUID(), ipHash, step, success ? 1 : 0, outcome).run();
}
async function adminFor(request, env) {
  const raw = cookieValue(request, ADMIN_SESSION_COOKIE);
  if (!raw) return null;
  const row = await env.DB.prepare(
    "SELECT * FROM admin_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>? AND idle_expires_at>?",
  ).bind(await digest(raw + env.SESSION_PEPPER), now(), now()).first();
  if (!row) return null;
  const expectedIp = await adminIpHash(request, env);
  if (!safeEqual(row.ip_hash, expectedIp)) return null;
  if (Date.now() - dbTime(row.last_seen_at) > 5 * 60 * 1000)
    await env.DB.prepare(
      "UPDATE admin_sessions SET last_seen_at=CURRENT_TIMESTAMP,idle_expires_at=? WHERE id=?",
    ).bind(afterMs(30 * 60 * 1000), row.id).run();
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
    await logAdminAttempt(env, ipHash, 1, false, blocked ? "blocked" : "invalid");
    if (blocked)
      await adminNotice(env, "security", "Accès administrateur temporairement bloqué", "Le seuil de tentatives a été atteint.", "critical", "/admin/journal-activite/");
    return bad("Secret incorrect.", 401);
  }
  const raw = token();
  await env.DB.prepare(
    "INSERT INTO admin_auth_challenges(id,token_hash,ip_hash,expires_at) VALUES(?,?,?,?)",
  ).bind(crypto.randomUUID(), await digest(raw + env.SESSION_PEPPER), ipHash, afterMs(5 * 60 * 1000)).run();
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
      ).bind(await digest(rawChallenge + env.SESSION_PEPPER), ipHash, now()).first()
    : null;
  if (!challenge) return bad("La première étape a expiré.", 401);
  if (!(await verifyAdminSecret(env, 2, body.secret))) {
    const blocked = await adminRateFailure(env, bucket);
    await logAdminAttempt(env, ipHash, 2, false, blocked ? "blocked" : "invalid");
    return bad("Secret incorrect.", 401);
  }
  const rawSession = token();
  const sessionId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("UPDATE admin_auth_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=?").bind(challenge.id),
    env.DB.prepare(
      "INSERT INTO admin_sessions(id,token_hash,ip_hash,expires_at,idle_expires_at) VALUES(?,?,?,?,?)",
    ).bind(sessionId, await digest(rawSession + env.SESSION_PEPPER), ipHash, afterMs(8 * 60 * 60 * 1000), afterMs(30 * 60 * 1000)),
    env.DB.prepare("DELETE FROM admin_rate_limits WHERE bucket_key=?").bind(bucket),
  ]);
  await logAdminAttempt(env, ipHash, 2, true, "authenticated");
  await adminAudit(env, sessionId, "admin_login", "admin_session", sessionId);
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  headers.append("set-cookie", adminCookie(ADMIN_SESSION_COOKIE, rawSession, 8 * 60 * 60));
  headers.append("set-cookie", adminCookie(ADMIN_CHALLENGE_COOKIE, "", 0));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
async function adminLogout(request, env) {
  assertAdminOrigin(request, env);
  const raw = cookieValue(request, ADMIN_SESSION_COOKIE);
  const session = await adminFor(request, env);
  if (raw)
    await env.DB.prepare("UPDATE admin_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?")
      .bind(await digest(raw + env.SESSION_PEPPER)).run();
  if (session) await adminAudit(env, session.id, "admin_logout", "admin_session", session.id);
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
    admin: { sessionExpiresAt: session.expires_at, idleExpiresAt: session.idle_expires_at },
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
  if (env.ENVIRONMENT === "test" && /^\d{6}$/.test(env.ADMIN_EMAIL_TEST_CODE || ""))
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
  if (![1, 2].includes(level) || !(await verifyAdminSecret(env, level, body.currentSecret)))
    return bad("Le secret actuel est incorrect.", 401);
  if (!validAdminSecret(body.newSecret) || body.newSecret !== body.confirmSecret)
    return bad("Le nouveau secret est invalide ou sa confirmation diffère.");
  if (safeEqual(body.currentSecret, body.newSecret))
    return bad("Le nouveau secret doit être différent.");
  const config = await adminConfig(env);
  if (!config?.primary_email_verified_at)
    return bad("Vérifiez d’abord l’adresse email administrative.", 409);
  const id = crypto.randomUUID();
  const salt = token();
  const code = verificationCode(env);
  const delivered = await sendEmail(env, { to: config.primary_email, template: "admin_verification", code });
  if (!delivered) return bad("Le service email administratif est indisponible.", 503);
  await env.DB.prepare(
    "INSERT INTO admin_secret_changes(id,admin_session_id,secret_level,new_secret_hash,new_secret_salt,verification_code_hash,expires_at) VALUES(?,?,?,?,?,?,?)",
  ).bind(id, session.id, level, await adminSecretHash(body.newSecret, salt, env, level), salt, await adminCodeHash(code, env, id), afterMs(10 * 60 * 1000)).run();
  await adminAudit(env, session.id, "secret_change_requested", "admin_secret", String(level));
  return json({ ok: true, requestId: id });
}
async function confirmAdminSecretChange(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json().catch(() => ({}));
  const id = clean(body.requestId, 80);
  const row = await env.DB.prepare(
    "SELECT * FROM admin_secret_changes WHERE id=? AND admin_session_id=? AND completed_at IS NULL AND expires_at>?",
  ).bind(id, session.id, now()).first();
  if (!row || row.attempts >= 5) return bad("Demande expirée ou invalide.", 410);
  if (!safeEqual(await adminCodeHash(String(body.code || ""), env, id), row.verification_code_hash)) {
    await env.DB.prepare("UPDATE admin_secret_changes SET attempts=attempts+1 WHERE id=?").bind(id).run();
    return bad("Code de validation incorrect.", 401);
  }
  const config = await adminConfig(env);
  const column = row.secret_level === 1 ? "secret_1" : "secret_2";
  await env.DB.batch([
    env.DB.prepare(`UPDATE admin_security_config SET ${column}_hash=?,${column}_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`).bind(row.new_secret_hash, row.new_secret_salt),
    env.DB.prepare("UPDATE admin_secret_changes SET completed_at=CURRENT_TIMESTAMP WHERE id=?").bind(id),
    env.DB.prepare("UPDATE admin_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id<>? AND revoked_at IS NULL").bind(session.id),
  ]);
  await adminAudit(env, session.id, "secret_changed", "admin_secret", String(row.secret_level), { rotated: Boolean(config?.[`${column}_hash`]) }, { rotated: true });
  await adminNotice(env, "security", `Secret niveau ${row.secret_level} modifié`, "Les autres sessions administrateur ont été révoquées.", "success", "/admin/securite/");
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
  const delivered = await sendEmail(env, { to: email, template: "admin_verification", code });
  if (!delivered) return bad("Le service email administratif est indisponible.", 503);
  await env.DB.prepare(
    "INSERT INTO admin_email_changes(id,admin_session_id,new_email,verification_code_hash,expires_at) VALUES(?,?,?,?,?)",
  ).bind(id, session.id, email, await adminCodeHash(code, env, id), afterMs(10 * 60 * 1000)).run();
  await adminAudit(env, session.id, "admin_email_change_requested", "admin_email", null);
  return json({ ok: true, requestId: id });
}
async function confirmAdminEmailChange(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json().catch(() => ({}));
  const id = clean(body.requestId, 80);
  const row = await env.DB.prepare(
    "SELECT * FROM admin_email_changes WHERE id=? AND admin_session_id=? AND completed_at IS NULL AND expires_at>?",
  ).bind(id, session.id, now()).first();
  if (!row || row.attempts >= 5) return bad("Demande expirée ou invalide.", 410);
  if (!safeEqual(await adminCodeHash(String(body.code || ""), env, id), row.verification_code_hash)) {
    await env.DB.prepare("UPDATE admin_email_changes SET attempts=attempts+1 WHERE id=?").bind(id).run();
    return bad("Code de validation incorrect.", 401);
  }
  const before = await adminConfig(env);
  await env.DB.batch([
    env.DB.prepare("UPDATE admin_security_config SET primary_email=?,primary_email_verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=1").bind(row.new_email),
    env.DB.prepare("UPDATE admin_email_changes SET completed_at=CURRENT_TIMESTAMP WHERE id=?").bind(id),
  ]);
  await adminAudit(env, session.id, "admin_email_changed", "admin_email", null, { emailConfigured: Boolean(before?.primary_email) }, { emailConfigured: true, verified: true });
  return json({ ok: true, email: row.new_email });
}
async function adminEmailTest(request, env) {
  const session = await requireAdmin(request, env);
  const config = await adminConfig(env);
  if (!config?.primary_email_verified_at) return bad("Aucune adresse administrative vérifiée.", 409);
  if (!(await sendEmail(env, { to: config.primary_email, template: "admin_test" })))
    return bad("Le service email administratif est indisponible.", 503);
  await adminAudit(env, session.id, "admin_email_test_sent", "admin_email", null);
  return json({ ok: true });
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
  await env.DB.prepare("UPDATE admin_notifications SET read_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  return json({ ok: true });
}
async function adminAuditList(request, env) {
  await requireAdmin(request, env);
  const { results = [] } = await env.DB.prepare(
    "SELECT id,action,resource_type,resource_id,metadata_json,created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100",
  ).all();
  return json({ items: results.map((item) => ({ ...item, metadata: parseStored(item.metadata_json, {}) })) });
}
async function adminSearch(request, env) {
  await requireAdmin(request, env);
  const query = clean(new URL(request.url).searchParams.get("q"), 120);
  if (query.length < 2) return json({ items: [] });
  const like = `%${query}%`;
  const { results = [] } = await env.DB.prepare(
    "SELECT id,email label,role type,'/admin/' || CASE role WHEN 'candidate' THEN 'demandeurs' WHEN 'recruiter' THEN 'recruteurs' ELSE 'tableau-de-bord' END || '/' href FROM users WHERE email LIKE ? UNION ALL SELECT id,title label,'job' type,'/admin/offres/' href FROM job_offers WHERE title LIKE ? UNION ALL SELECT id,id label,'application' type,'/admin/candidatures/' href FROM applications WHERE id LIKE ? LIMIT 20",
  ).bind(like, like, like).all();
  return json({ items: results });
}
async function adminStats(request, env) {
  await requireAdmin(request, env);
  const row = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM users WHERE role='candidate') candidates,(SELECT COUNT(*) FROM users WHERE role='recruiter') recruiters,(SELECT COUNT(*) FROM job_offers WHERE status='published') active_jobs,(SELECT COUNT(*) FROM applications) applications",
  ).first();
  return json({ stats: row });
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
    await adminAudit(env, user.id, "question_created", "questionnaire_question", id);
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
    if (request.method === "OPTIONS")
      return new Response(null, { headers: cors(request) });
    try {
      let response;
      if (path === "/api/public/stats") response = await publicStats(env);
      else if (path === "/api/auth/register" && request.method === "POST")
        response = await register(request, env);
      else if (path === "/api/auth/login" && request.method === "POST")
        response = await login(request, env);
      else if (path === "/api/auth/logout" && request.method === "POST") {
        const raw = sessionToken(request);
        if (raw)
          await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
            .bind(await digest(raw + env.SESSION_PEPPER))
            .run();
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
      else if (path === "/api/admin/security/secret-change/request" && request.method === "POST")
        response = await requestAdminSecretChange(request, env);
      else if (path === "/api/admin/security/secret-change/confirm" && request.method === "POST")
        response = await confirmAdminSecretChange(request, env);
      else if (path === "/api/admin/security/email-change/request" && request.method === "POST")
        response = await requestAdminEmailChange(request, env);
      else if (path === "/api/admin/security/email-change/confirm" && request.method === "POST")
        response = await confirmAdminEmailChange(request, env);
      else if (path === "/api/admin/security/email-test" && request.method === "POST")
        response = await adminEmailTest(request, env);
      else if (path === "/api/admin/notifications" || path.startsWith("/api/admin/notifications/"))
        response = await adminNotifications(request, env, path);
      else if (path === "/api/admin/audit" && request.method === "GET")
        response = await adminAuditList(request, env);
      else if (path === "/api/admin/search" && request.method === "GET")
        response = await adminSearch(request, env);
      else if (path === "/api/admin/stats")
        response = await adminStats(request, env);
      else if (
        path === "/api/admin/questionnaire" ||
        path.startsWith("/api/admin/questionnaire/")
      )
        response = await adminQuestionnaire(request, env, path);
      else response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      Object.entries(cors(request)).forEach(([key, value]) =>
        headers.set(key, value),
      );
      headers.set("x-content-type-options", "nosniff");
      headers.set("referrer-policy", "strict-origin-when-cross-origin");
      headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
      if (path.startsWith("/api/admin/")) headers.set("cache-control", "no-store");
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      if (error instanceof Response) {
        const headers = new Headers(error.headers);
        Object.entries(cors(request)).forEach(([key, value]) => headers.set(key, value));
        headers.set("cache-control", "no-store");
        return new Response(error.body, { status: error.status, headers });
      }
      console.error(
        JSON.stringify({
          event: "api_error",
          path,
          error: String(error),
          stack: error?.stack,
        }),
      );
      return bad("Une erreur est survenue.", 500);
    }
  },
};
