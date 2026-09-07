const statuses = new Set([
  "received",
  "reviewing",
  "shortlisted",
  "interview",
  "accepted",
  "refused",
  "archived",
]);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
const bad = (message, status = 400) => json({ userMessage: message }, status);
const clean = (value, max = 500) => {
  const result = typeof value === "string" ? value.trim() : "";
  return result.length <= max ? result : "";
};

async function documentBody(env, documentId) {
  const { results = [] } = await env.DB.prepare(
    "SELECT data FROM v2_applicant_document_chunks WHERE document_id=? ORDER BY chunk_index",
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

async function listApplicants(request, env) {
  const url = new URL(request.url);
  const query = clean(url.searchParams.get("q"), 120);
  const status = statuses.has(url.searchParams.get("status"))
    ? url.searchParams.get("status")
    : "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = 25;
  const filters = [];
  const bindings = [];
  if (query) {
    filters.push(
      "(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR reference LIKE ? OR professional_title LIKE ?)",
    );
    for (let index = 0; index < 5; index += 1) bindings.push(`%${query}%`);
  }
  if (status) {
    filters.push("status=?");
    bindings.push(status);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [items, total, stats] = await Promise.all([
    env.DB.prepare(
      `SELECT id,reference,first_name,last_name,email,phone,city,country,professional_title,domain,experience_level,availability,status,created_at,reviewed_at FROM v2_applicants ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...bindings, limit, (page - 1) * limit)
      .all(),
    env.DB.prepare(`SELECT COUNT(*) total FROM v2_applicants ${where}`)
      .bind(...bindings)
      .first(),
    env.DB.prepare(
      "SELECT COUNT(*) total,SUM(CASE WHEN status='received' THEN 1 ELSE 0 END) received,SUM(CASE WHEN status='reviewing' THEN 1 ELSE 0 END) reviewing,SUM(CASE WHEN status='shortlisted' THEN 1 ELSE 0 END) shortlisted FROM v2_applicants",
    ).first(),
  ]);
  return json({
    items: items.results || [],
    total: Number(total?.total || 0),
    page,
    pages: Math.max(1, Math.ceil(Number(total?.total || 0) / limit)),
    stats: {
      total: Number(stats?.total || 0),
      received: Number(stats?.received || 0),
      reviewing: Number(stats?.reviewing || 0),
      shortlisted: Number(stats?.shortlisted || 0),
    },
  });
}

async function applicantDetail(env, id) {
  const item = await env.DB.prepare(
    "SELECT * FROM v2_applicants WHERE id=?",
  )
    .bind(id)
    .first();
  if (!item) return bad("Postulant introuvable.", 404);
  item.answers = JSON.parse(item.answers_json || "{}");
  delete item.answers_json;
  const [documents, history] = await Promise.all([
    env.DB.prepare(
      "SELECT id,kind,original_name,content_type,size_bytes,created_at FROM v2_applicant_documents WHERE applicant_id=? ORDER BY created_at",
    )
      .bind(id)
      .all(),
    env.DB.prepare(
      "SELECT previous_status,next_status,note,created_at FROM v2_applicant_history WHERE applicant_id=? ORDER BY created_at DESC",
    )
      .bind(id)
      .all(),
  ]);
  return json({
    item,
    documents: documents.results || [],
    history: history.results || [],
  });
}

async function updateApplicant(request, env, id, adminSessionId) {
  const current = await env.DB.prepare(
    "SELECT status,admin_notes FROM v2_applicants WHERE id=?",
  )
    .bind(id)
    .first();
  if (!current) return bad("Postulant introuvable.", 404);
  const body = await request.json().catch(() => ({}));
  const nextStatus = statuses.has(body.status) ? body.status : current.status;
  const notes =
    typeof body.adminNotes === "string"
      ? clean(body.adminNotes, 4000)
      : current.admin_notes;
  if (typeof body.adminNotes === "string" && body.adminNotes.trim() && !notes) {
    return bad("La note est trop longue.", 422);
  }
  const statements = [
    env.DB.prepare(
      "UPDATE v2_applicants SET status=?,admin_notes=?,reviewed_at=CASE WHEN ?<>'received' THEN COALESCE(reviewed_at,CURRENT_TIMESTAMP) ELSE reviewed_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(nextStatus, notes || null, nextStatus, id),
  ];
  if (nextStatus !== current.status) {
    statements.push(
      env.DB.prepare(
        "INSERT INTO v2_applicant_history(id,applicant_id,admin_session_id,previous_status,next_status,note) VALUES(?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        id,
        adminSessionId,
        current.status,
        nextStatus,
        clean(body.historyNote, 1000) || null,
      ),
    );
  }
  await env.DB.batch(statements);
  return applicantDetail(env, id);
}

async function downloadDocument(env, applicantId, documentId) {
  const document = await env.DB.prepare(
    "SELECT * FROM v2_applicant_documents WHERE id=? AND applicant_id=?",
  )
    .bind(documentId, applicantId)
    .first();
  if (!document) return bad("Document introuvable.", 404);
  const body = await documentBody(env, document.id);
  if (!body) return bad("Document introuvable.", 404);
  return new Response(body, {
    headers: {
      "content-type": document.content_type,
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.original_name)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function adminV2Applicants(
  request,
  env,
  path,
  adminSessionId,
) {
  if (path === "/api/admin/v2/applicants" && request.method === "GET") {
    return listApplicants(request, env);
  }
  const match = path.match(
    /^\/api\/admin\/v2\/applicants\/([^/]+)(?:\/documents\/([^/]+))?$/,
  );
  if (!match) return bad("Action non prise en charge.", 405);
  const [, applicantId, documentId] = match;
  if (documentId && request.method === "GET") {
    return downloadDocument(env, applicantId, documentId);
  }
  if (request.method === "GET") return applicantDetail(env, applicantId);
  if (request.method === "PATCH") {
    return updateApplicant(request, env, applicantId, adminSessionId);
  }
  return bad("Action non prise en charge.", 405);
}
