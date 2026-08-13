import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const secret1 = `A1!${randomBytes(18).toString("base64url")}`;
const secret2 = `B2!${randomBytes(18).toString("base64url")}`;
const newSecret1 = `C3!${randomBytes(18).toString("base64url")}`;
const code = String(100000 + Math.floor(Math.random() * 900000));
const port = 8791;
const base = `http://127.0.0.1:${port}`;
const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const projectDir = fileURLToPath(new URL("..", import.meta.url));
const cleanState = spawnSync(process.execPath, [wrangler, "d1", "execute", "workcrute", "--local", "--command", "DELETE FROM admin_secret_changes; DELETE FROM admin_email_changes; DELETE FROM admin_sessions; DELETE FROM admin_auth_challenges; DELETE FROM admin_rate_limits; UPDATE admin_security_config SET secret_1_hash=NULL,secret_1_salt=NULL,secret_2_hash=NULL,secret_2_salt=NULL,primary_email=NULL,primary_email_verified_at=NULL WHERE id=1"], { cwd:projectDir, stdio:"ignore" });
if (cleanState.status !== 0) throw new Error("Impossible d'initialiser la base de test admin");
const pepper = randomBytes(32).toString("hex");
const server = spawn(process.execPath, [wrangler, "dev", "--local", "--port", String(port), "--var", `ADMIN_AUTH_SECRET_1:${secret1}`, "--var", `ADMIN_AUTH_SECRET_2:${secret2}`, "--var", `SESSION_PEPPER:${pepper}`, "--var", `ADMIN_EMAIL_TEST_CODE:${code}`, "--var", "ENVIRONMENT:test"], {
  cwd: projectDir,
  env: process.env,
  stdio: "ignore",
});
let cookies = new Map();
const check = (condition, label) => { if (!condition) throw new Error(`Échec: ${label}`); process.stdout.write(`✓ ${label}\n`); };
const request = async (path, body, forwarded = "198.51.100.10") => {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(body === undefined ? {} : { "content-type":"application/json" }), "x-forwarded-for": forwarded, cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join("; ") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie") || "";
  for (const match of setCookie.matchAll(/(wc_admin_(?:session|challenge))=([^;,]*)/g)) match[2] ? cookies.set(match[1], match[2]) : cookies.delete(match[1]);
  return { response, data: await response.json().catch(() => ({})) };
};
const waitReady = async () => {
  for (let i=0;i<150;i+=1) { try { const r=await fetch(`${base}/admin/connexion/`); if(r.ok)return; } catch {} await new Promise(r=>setTimeout(r,200)); }
  throw new Error("Serveur local indisponible");
};
try {
  await waitReady();
  let result = await request("/api/admin/auth/step-1", { secret:"incorrect" }); check(result.response.status === 401, "secret 1 incorrect refusé");
  result = await request("/api/admin/auth/step-1", { secret:secret1 }); check(result.response.ok, `secret 1 correct accepté (${result.response.status}: ${result.data.error || "ok"})`);
  result = await request("/api/admin/auth/step-2", { secret:"incorrect" }); check(result.response.status === 401, "bon secret 1 + mauvais secret 2 refusé");
  result = await request("/api/admin/auth/step-1", { secret:secret1 }); check(result.response.ok, "nouveau défi niveau 1 créé");
  result = await request("/api/admin/auth/step-2", { secret:secret2 }); check(result.response.ok, "authentification complète réussie");
  result = await request("/api/admin/auth/me"); check(result.response.ok, "session admin active");
  result = await request("/api/admin/security/email-change/request", { email:"admin-test@example.com", secret2 }); check(result.response.ok, "code de confirmation email demandé");
  const emailRequestId = result.data.requestId;
  result = await request("/api/admin/security/email-change/confirm", { requestId:emailRequestId, code }); check(result.response.ok, "email admin confirmé");
  result = await request("/api/admin/security/email-test", {}); check(result.response.ok, "email test envoyé");
  result = await request("/api/admin/security/secret-change/request", { level:1, currentSecret:secret1, newSecret:newSecret1, confirmSecret:newSecret1 }); check(result.response.ok, "changement secret demandé");
  result = await request("/api/admin/security/secret-change/confirm", { requestId:result.data.requestId, code }); check(result.response.ok, "changement secret confirmé par email");
  result = await request("/api/admin/auth/logout", {}); check(result.response.ok, "déconnexion réussie");
  result = await request("/api/admin/auth/me"); check(result.response.status === 401, "session révoquée après logout");
  cookies = new Map();
  result = await request("/api/admin/auth/step-1", { secret:secret1 }, "198.51.100.11"); check(result.response.status === 401, "ancien secret révoqué");
  result = await request("/api/admin/auth/step-1", { secret:newSecret1 }, "198.51.100.11"); check(result.response.ok, "nouveau secret actif");
  result = await request("/api/admin/auth/step-2", { secret:secret2 }, "198.51.100.11"); check(result.response.ok, "nouvelle session après rotation");
  for (let i=0;i<5;i+=1) await request("/api/admin/auth/step-1", { secret:"invalid" }, "198.51.100.99");
  result = await request("/api/admin/auth/step-1", { secret:"invalid" }, "198.51.100.99"); check(result.response.status === 429, `rate limit et protection brute force actifs (${result.response.status})`);
  const expired = spawnSync(process.execPath, [wrangler, "d1", "execute", "workcrute", "--local", "--command", "UPDATE admin_sessions SET idle_expires_at='2000-01-01T00:00:00.000Z' WHERE revoked_at IS NULL"], { cwd:fileURLToPath(new URL("..",import.meta.url)), encoding:"utf8" });
  check(expired.status === 0, "expiration de test appliquée en base");
  result = await request("/api/admin/auth/me", undefined, "198.51.100.11"); check(result.response.status === 401, "session expirée refusée");
  process.stdout.write("Admin security integration: OK\n");
} finally {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio:"ignore" });
  else server.kill("SIGTERM");
}
