const encoder = new TextEncoder();
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
const bad = (message, status = 400) => json({ userMessage: message }, status);
const clean = (value, max = 100) => {
  const result = typeof value === "string" ? value.trim() : "";
  return result && result.length <= max ? result : "";
};
const normalizeName = (value) =>
  clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/\s+/g, " ");
const token = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
const safeEqual = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};
const cookieValue = (request, name) =>
  request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || null;
const sessionCookie = (value, maxAge = 0) =>
  `wc_v2_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export async function v2SessionFor(request, env, roles) {
  const raw = cookieValue(request, "wc_v2_session");
  if (!raw) return null;
  const row = await env.DB.prepare(
    "SELECT s.id session_id,s.expires_at,a.id account_id,a.role,a.first_name,a.last_name,a.preferred_language FROM v2_sessions s JOIN v2_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND a.account_status='active'",
  )
    .bind(await digest(raw + env.SESSION_PEPPER))
    .first();
  if (!row || (roles && !roles.includes(row.role))) return null;
  return row;
}

export async function requireV2Session(request, env, roles) {
  const session = await v2SessionFor(request, env, roles);
  if (!session) throw bad("Authentification requise.", 401);
  return session;
}

async function login(request, env) {
  const body = await request.json().catch(() => ({}));
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const password = typeof body.password === "string" && body.password.length <= 256 ? body.password : "";
  if (!firstName || !lastName || !password) return bad("Nom, prénom et mot de passe sont obligatoires.", 422);
  const identity = `${normalizeName(firstName)}:${normalizeName(lastName)}`;
  const address = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const fingerprint = await digest(`${address}:${env.SESSION_PEPPER}`);
  const identityHash = await digest(`${identity}:${env.SESSION_PEPPER}`);
  await env.DB.prepare("DELETE FROM v2_login_attempts WHERE attempted_at<datetime('now','-1 day')").run();
  const failures = await env.DB.prepare(
    "SELECT COUNT(*) total FROM v2_login_attempts WHERE fingerprint=? AND identity_hash=? AND success=0 AND attempted_at>=datetime('now','-15 minutes')",
  ).bind(fingerprint, identityHash).first();
  if (Number(failures?.total || 0) >= 5) return bad("Trop de tentatives. Réessayez dans quelques minutes.", 429);
  const account = await env.DB.prepare(
    "SELECT * FROM v2_accounts WHERE first_name_normalized=? AND last_name_normalized=? AND account_status='active'",
  ).bind(normalizeName(firstName), normalizeName(lastName)).first();
  const valid = account && safeEqual(await passwordHash(password, account.password_salt), account.password_hash);
  await env.DB.prepare(
    "INSERT INTO v2_login_attempts(fingerprint,identity_hash,success) VALUES(?,?,?)",
  ).bind(fingerprint, identityHash, valid ? 1 : 0).run();
  if (!valid) return bad("Identifiants incorrects.", 401);
  const raw = token();
  const sessionId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO v2_sessions(id,account_id,token_hash,expires_at) VALUES(?,?,?,datetime('now','+12 hours'))",
    ).bind(sessionId, account.id, await digest(raw + env.SESSION_PEPPER)),
    env.DB.prepare("UPDATE v2_accounts SET last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(account.id),
  ]);
  return json(
    {
      ok: true,
      account: {
        role: account.role,
        firstName: account.first_name,
        lastName: account.last_name,
        language: account.preferred_language,
      },
      redirect: account.role === "admin" ? "/admin/tableau-de-bord/" : "/employe/",
    },
    200,
    { "set-cookie": sessionCookie(raw, 12 * 60 * 60) },
  );
}

async function logout(request, env) {
  const raw = cookieValue(request, "wc_v2_session");
  if (raw) {
    await env.DB.prepare("UPDATE v2_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?")
      .bind(await digest(raw + env.SESSION_PEPPER))
      .run();
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

async function me(request, env) {
  const session = await requireV2Session(request, env);
  return json({
    account: {
      role: session.role,
      firstName: session.first_name,
      lastName: session.last_name,
      language: session.preferred_language,
    },
  });
}

export async function configureV2Admin(request, env) {
  if (request.method === "GET") {
    const account = await env.DB.prepare(
      "SELECT id,first_name,last_name,account_status,preferred_language,updated_at FROM v2_accounts WHERE role='admin'",
    ).first();
    return json({ configured: Boolean(account), account: account || null });
  }
  if (request.method !== "PUT") return bad("Action non prise en charge.", 405);
  const body = await request.json().catch(() => ({}));
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const password = typeof body.password === "string" ? body.password : "";
  if (!firstName || !lastName || password.length < 12 || password.length > 256) {
    return bad("Nom, prénom et mot de passe de 12 caractères minimum sont obligatoires.", 422);
  }
  const collision = await env.DB.prepare(
    "SELECT id FROM v2_accounts WHERE first_name_normalized=? AND last_name_normalized=? AND role<>'admin'",
  ).bind(normalizeName(firstName), normalizeName(lastName)).first();
  if (collision) return bad("Cette identité est déjà utilisée.", 409);
  const existing = await env.DB.prepare("SELECT id FROM v2_accounts WHERE role='admin'").first();
  const id = existing?.id || crypto.randomUUID();
  const salt = token();
  const hash = await passwordHash(password, salt);
  await env.DB.prepare(
    "INSERT INTO v2_accounts(id,role,first_name,last_name,first_name_normalized,last_name_normalized,password_hash,password_salt) VALUES(?,'admin',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,first_name_normalized=excluded.first_name_normalized,last_name_normalized=excluded.last_name_normalized,password_hash=excluded.password_hash,password_salt=excluded.password_salt,account_status='active',updated_at=CURRENT_TIMESTAMP",
  ).bind(id, firstName, lastName, normalizeName(firstName), normalizeName(lastName), hash, salt).run();
  await env.DB.prepare("UPDATE v2_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(id).run();
  return json({ ok: true });
}

export async function v2Auth(request, env, path) {
  if (path === "/api/v2/auth/login" && request.method === "POST") return login(request, env);
  if (path === "/api/v2/auth/logout" && request.method === "POST") return logout(request, env);
  if (path === "/api/v2/auth/me" && request.method === "GET") return me(request, env);
  return bad("Action non prise en charge.", 405);
}
