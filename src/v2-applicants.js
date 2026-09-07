const MAX_FILE_BYTES = 8 * 1024 * 1024;
const CHUNK_BYTES = 512 * 1024;
const MIME_BY_EXTENSION = {
  pdf: new Set(["application/pdf"]),
  doc: new Set(["application/msword", "application/octet-stream"]),
  docx: new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ]),
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
const fail = (code, message, status = 400, fields) =>
  json({ code, userMessage: message, ...(fields ? { fields } : {}) }, status);
const clean = (value, max) => {
  const result = typeof value === "string" ? value.trim() : "";
  return result && result.length <= max ? result : "";
};
const validEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value) && value.length <= 254;
const validPhone = (value) => /^\+?[0-9 ()-]{8,24}$/u.test(value);
const extensionOf = (file) =>
  String(file?.name || "").split(".").pop()?.toLowerCase() || "";

async function digest(value) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function validFile(file, required) {
  if (!(file instanceof File) || !file.size) {
    return required ? "required" : null;
  }
  const extension = extensionOf(file);
  if (!MIME_BY_EXTENSION[extension]?.has(file.type || "application/octet-stream")) {
    return "type";
  }
  if (file.size > MAX_FILE_BYTES) return "size";
  return null;
}

async function storeFile(env, applicantId, kind, file) {
  const documentId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO v2_applicant_documents(id,applicant_id,kind,original_name,content_type,size_bytes) VALUES(?,?,?,?,?,?)",
  )
    .bind(
      documentId,
      applicantId,
      kind,
      file.name.slice(0, 180),
      file.type || "application/octet-stream",
      file.size,
    )
    .run();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const statements = [];
  for (let offset = 0, index = 0; offset < bytes.length; offset += CHUNK_BYTES, index += 1) {
    statements.push(
      env.DB.prepare(
        "INSERT INTO v2_applicant_document_chunks(document_id,chunk_index,data) VALUES(?,?,?)",
      ).bind(documentId, index, bytes.slice(offset, offset + CHUNK_BYTES)),
    );
  }
  if (statements.length) await env.DB.batch(statements);
}

async function enforceRateLimit(request, env) {
  const address =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "local";
  const fingerprint = await digest(`${address}:${env.SESSION_PEPPER || "workcrute"}`);
  await env.DB.prepare(
    "DELETE FROM v2_submission_attempts WHERE attempted_at < datetime('now','-1 day')",
  ).run();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) total FROM v2_submission_attempts WHERE fingerprint=? AND attempted_at >= datetime('now','-15 minutes')",
  )
    .bind(fingerprint)
    .first();
  if (Number(recent?.total || 0) >= 5) return false;
  await env.DB.prepare(
    "INSERT INTO v2_submission_attempts(fingerprint) VALUES(?)",
  )
    .bind(fingerprint)
    .run();
  return true;
}

function reference() {
  const month = new Date().toISOString().slice(0, 7).replace("-", "");
  const random = crypto.getRandomValues(new Uint32Array(1))[0]
    .toString(36)
    .toUpperCase()
    .padStart(6, "0")
    .slice(-6);
  return `WC-${month}-${random}`;
}

export async function submitV2Applicant(request, env) {
  if (request.method !== "POST") {
    return fail("METHOD_NOT_ALLOWED", "Action non prise en charge.", 405);
  }
  if (!(await enforceRateLimit(request, env))) {
    return fail(
      "RATE_LIMITED",
      "Trop de tentatives. Réessayez dans quelques minutes.",
      429,
    );
  }
  const form = await request.formData();
  const idempotencyKey = clean(form.get("idempotencyKey"), 80);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(idempotencyKey)) {
    return fail("INVALID_REQUEST", "Le formulaire a expiré. Rechargez la page.", 400);
  }
  const existing = await env.DB.prepare(
    "SELECT reference FROM v2_applicants WHERE idempotency_key=?",
  )
    .bind(idempotencyKey)
    .first();
  if (existing) return json({ ok: true, reference: existing.reference });

  const values = {
    firstName: clean(form.get("firstName"), 80),
    lastName: clean(form.get("lastName"), 80),
    email: clean(form.get("email"), 254).toLowerCase(),
    phone: clean(form.get("phone"), 30),
    city: clean(form.get("city"), 120),
    country: clean(form.get("country"), 120),
    professionalTitle: clean(form.get("professionalTitle"), 160),
    domain: clean(form.get("domain"), 120),
    domainOther: clean(form.get("domainOther"), 160),
    experienceLevel: clean(form.get("experienceLevel"), 40),
    availability: clean(form.get("availability"), 80),
    motivation: clean(form.get("motivation"), 2000),
    language: ["fr", "en", "ar"].includes(form.get("language"))
      ? form.get("language")
      : "fr",
  };
  const fields = {};
  for (const name of [
    "firstName",
    "lastName",
    "email",
    "phone",
    "city",
    "country",
    "professionalTitle",
    "domain",
    "experienceLevel",
    "availability",
  ]) {
    if (!values[name]) fields[name] = "required";
  }
  if (values.email && !validEmail(values.email)) fields.email = "invalid";
  if (values.phone && !validPhone(values.phone)) fields.phone = "invalid";
  if (values.domain === "other" && !values.domainOther) fields.domainOther = "required";
  if (form.get("consent") !== "true") fields.consent = "required";

  const cv = form.get("cv");
  const coverLetter = form.get("coverLetter");
  const cvError = validFile(cv, true);
  const coverError = validFile(coverLetter, false);
  if (cvError) fields.cv = cvError;
  if (coverError) fields.coverLetter = coverError;
  if (Object.keys(fields).length) {
    return fail(
      "VALIDATION_ERROR",
      "Vérifiez les champs indiqués et conservez les informations déjà saisies.",
      422,
      fields,
    );
  }

  let answers = {};
  try {
    answers = JSON.parse(String(form.get("answers") || "{}"));
  } catch {
    return fail("VALIDATION_ERROR", "Les réponses au questionnaire sont invalides.", 422);
  }
  const applicantId = crypto.randomUUID();
  const applicantReference = reference();
  try {
    await env.DB.prepare(
      "INSERT INTO v2_applicants(id,reference,first_name,last_name,email,phone,city,country,professional_title,domain,domain_other,experience_level,availability,motivation,answers_json,preferred_language,consent_at,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?)",
    )
      .bind(
        applicantId,
        applicantReference,
        values.firstName,
        values.lastName,
        values.email,
        values.phone,
        values.city,
        values.country,
        values.professionalTitle,
        values.domain,
        values.domainOther || null,
        values.experienceLevel,
        values.availability,
        values.motivation || null,
        JSON.stringify(answers),
        values.language,
        idempotencyKey,
      )
      .run();
    await storeFile(env, applicantId, "cv", cv);
    if (coverLetter instanceof File && coverLetter.size) {
      await storeFile(env, applicantId, "cover_letter", coverLetter);
    }
    const admin = await env.DB.prepare(
      "SELECT primary_email FROM admin_security_config WHERE id=1 AND primary_email_verified_at IS NOT NULL",
    ).first();
    const emails = [
      env.DB.prepare(
        "INSERT INTO v2_applicant_email_outbox(id,applicant_id,audience,recipient,language) VALUES(?,?,?,?,?)",
      ).bind(crypto.randomUUID(), applicantId, "applicant", values.email, values.language),
    ];
    if (admin?.primary_email) {
      emails.push(
        env.DB.prepare(
          "INSERT INTO v2_applicant_email_outbox(id,applicant_id,audience,recipient,language) VALUES(?,?,?,?,?)",
        ).bind(crypto.randomUUID(), applicantId, "admin", admin.primary_email, "fr"),
      );
    }
    emails.push(
      env.DB.prepare(
        "INSERT INTO admin_notifications(id,category,title,body,severity,href) VALUES(?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        "applications",
        "Nouvelle candidature V2",
        `${values.firstName} ${values.lastName} - ${applicantReference}`,
        "info",
        "/admin/candidatures-v2/",
      ),
    );
    await env.DB.batch(emails);
  } catch (error) {
    await env.DB.prepare("DELETE FROM v2_applicants WHERE id=?")
      .bind(applicantId)
      .run()
      .catch(() => {});
    throw error;
  }
  return json({ ok: true, reference: applicantReference }, 201);
}

const mailCopy = {
  fr: {
    applicantSubject: "Votre candidature Workcrute a bien été reçue",
    applicantBody: (row) => `Bonjour ${row.first_name},\n\nVotre candidature a bien été reçue sous la référence ${row.reference}.\n\nL’équipe Workcrute.`,
  },
  en: {
    applicantSubject: "Your Workcrute application has been received",
    applicantBody: (row) => `Hello ${row.first_name},\n\nYour application has been received under reference ${row.reference}.\n\nThe Workcrute team.`,
  },
  ar: {
    applicantSubject: "تم استلام طلبك لدى Workcrute",
    applicantBody: (row) => `مرحباً ${row.first_name}،\n\nتم استلام طلبك تحت المرجع ${row.reference}.\n\nفريق Workcrute.`,
  },
};

async function deliver(env, row) {
  const copy = mailCopy[row.language] || mailCopy.fr;
  const subject =
    row.audience === "admin"
      ? `[Workcrute] Nouvelle candidature - ${row.reference}`
      : copy.applicantSubject;
  const text =
    row.audience === "admin"
      ? `Nouvelle candidature de ${row.first_name} ${row.last_name}. Référence : ${row.reference}.`
      : copy.applicantBody(row);
  if (env.ENVIRONMENT === "test") return;
  if (env.EMAIL?.send) {
    await env.EMAIL.send({ to: row.recipient, from: env.EMAIL_FROM, subject, text });
    return;
  }
  if (!env.EMAIL_PROVIDER_API_KEY || !env.EMAIL_FROM) {
    throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [row.recipient], subject, text }),
  });
  if (!response.ok) throw new Error(`EMAIL_PROVIDER_${response.status}`);
}

export async function processV2ApplicantEmails(env, limit = 20) {
  const { results = [] } = await env.DB.prepare(
    "SELECT o.*,a.reference,a.first_name,a.last_name FROM v2_applicant_email_outbox o JOIN v2_applicants a ON a.id=o.applicant_id WHERE o.status IN ('pending','failed') AND o.attempts<o.max_attempts AND o.next_attempt_at<=CURRENT_TIMESTAMP ORDER BY o.created_at LIMIT ?",
  )
    .bind(limit)
    .all();
  for (const row of results) {
    await env.DB.prepare(
      "UPDATE v2_applicant_email_outbox SET status='processing',updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(row.id)
      .run();
    try {
      await deliver(env, row);
      await env.DB.prepare(
        "UPDATE v2_applicant_email_outbox SET status='sent',attempts=attempts+1,last_error=NULL,sent_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      )
        .bind(row.id)
        .run();
    } catch (error) {
      const attempts = Number(row.attempts) + 1;
      const delay = Math.min(3600, 60 * 2 ** attempts);
      await env.DB.prepare(
        "UPDATE v2_applicant_email_outbox SET status='failed',attempts=?,last_error=?,next_attempt_at=datetime('now',?),updated_at=CURRENT_TIMESTAMP WHERE id=?",
      )
        .bind(attempts, String(error).slice(0, 500), `+${delay} seconds`, row.id)
        .run();
    }
  }
}
