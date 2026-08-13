import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const secret1 = `A1!${randomBytes(18).toString("base64url")}`;
const secret2 = `B2!${randomBytes(18).toString("base64url")}`;
const pepper = randomBytes(32).toString("hex");
const email = `monitor-${randomBytes(8).toString("hex")}@example.com`;
const port = 8792;
const base = `http://127.0.0.1:${port}`;
const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const projectDir = fileURLToPath(new URL("..", import.meta.url));
const execute = (sql) => spawnSync(process.execPath, [wrangler, "d1", "execute", "workcrute", "--local", "--command", sql], { cwd:projectDir, encoding:"utf8" });
if (execute("DELETE FROM platform_events; DELETE FROM admin_sessions; DELETE FROM admin_auth_challenges; DELETE FROM admin_rate_limits; UPDATE admin_security_config SET secret_1_hash=NULL,secret_1_salt=NULL,secret_2_hash=NULL,secret_2_salt=NULL WHERE id=1").status !== 0)
  throw new Error("Impossible d’initialiser la base de monitoring");

const server = spawn(process.execPath, [wrangler, "dev", "--local", "--port", String(port), "--var", `ADMIN_AUTH_SECRET_1:${secret1}`, "--var", `ADMIN_AUTH_SECRET_2:${secret2}`, "--var", `SESSION_PEPPER:${pepper}`, "--var", "ENVIRONMENT:test"], { cwd:projectDir, env:process.env, stdio:"ignore" });
const adminCookies = new Map();
const userCookies = new Map();
const check = (condition, label) => { if (!condition) throw new Error(`Échec: ${label}`); process.stdout.write(`✓ ${label}\n`); };
const request = async (path, { method="GET", body, jar=adminCookies } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type":"application/json" }), "x-forwarded-for":"198.51.100.20", cookie:[...jar].map(([key,value]) => `${key}=${value}`).join("; ") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie") || "";
  for (const match of setCookie.matchAll(/(wc_(?:admin_(?:session|challenge)|session))=([^;,]*)/g)) match[2] ? jar.set(match[1], match[2]) : jar.delete(match[1]);
  return { response, data:await response.json().catch(() => ({})) };
};
const waitReady = async () => {
  for (let i = 0; i < 150; i += 1) {
    try { if ((await fetch(`${base}/admin/connexion/`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Serveur local indisponible");
};

try {
  await waitReady();
  let result = await request("/api/admin/dashboard");
  check(result.response.status === 401, "dashboard protégé sans session admin");
  result = await request("/api/admin/auth/step-1", { method:"POST", body:{ secret:secret1 } });
  check(result.response.ok, "premier niveau admin accepté");
  result = await request("/api/admin/auth/step-2", { method:"POST", body:{ secret:secret2 } });
  check(result.response.ok, "session admin créée");
  result = await request("/api/admin/dashboard");
  check(result.response.ok, "dashboard chargé");
  check(["operational", "degraded", "incident"].includes(result.data.system?.status), "état système calculé");
  check(Object.keys(result.data.totals || {}).length === 6, "six indicateurs plateforme réels");
  check(Object.keys(result.data.today || {}).length === 5, "cinq statistiques du jour réelles");
  check(result.data.pollAfterMs === 20000, "polling incrémental configuré à 20 secondes");
  const baseline = result.data.lastEventId;

  result = await request("/api/auth/register", { method:"POST", jar:userCookies, body:{ role:"candidate", email, firstName:"Test", lastName:"Monitoring", phone:"+212612345678", password:"Test!Monitoring2026", confirmPassword:"Test!Monitoring2026", acceptedTerms:true, language:"fr" } });
  check(result.response.status === 201, "inscription réelle créée pour le test live");
  result = await request(`/api/admin/dashboard?after=${baseline}&category=candidates`);
  check(result.response.ok && result.data.activity.some((item) => item.event_type === "USER_REGISTERED"), "nouvel événement reçu par lecture incrémentale");
  check(result.data.activity.every((item) => item.category === "candidates"), "filtre candidats appliqué côté serveur");
  const persisted = execute("SELECT event_type,category FROM platform_events WHERE event_type='USER_REGISTERED' ORDER BY id DESC LIMIT 1");
  check(persisted.status === 0 && persisted.stdout.includes("USER_REGISTERED"), "activité persistée dans D1");
  process.stdout.write("Admin live monitoring integration: OK\n");
} finally {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio:"ignore" });
  else server.kill("SIGTERM");
}
