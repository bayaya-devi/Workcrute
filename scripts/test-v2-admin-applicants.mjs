import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const secret1 = `A1!${randomBytes(18).toString("base64url")}`;
const secret2 = `B2!${randomBytes(18).toString("base64url")}`;
const pepper = randomBytes(32).toString("hex");
const suffix = randomBytes(5).toString("hex");
const port = 8797;
const base = `http://127.0.0.1:${port}`;
const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const projectDir = fileURLToPath(new URL("..", import.meta.url));
const reset = spawnSync(process.execPath, [wrangler, "d1", "execute", "workcrute", "--local", "--command", "DELETE FROM admin_sessions; DELETE FROM admin_auth_challenges; DELETE FROM admin_rate_limits; UPDATE admin_security_config SET secret_1_hash=NULL,secret_1_salt=NULL,secret_2_hash=NULL,secret_2_salt=NULL WHERE id=1"], { cwd:projectDir, stdio:"ignore" });
if (reset.status !== 0) throw new Error("Base locale indisponible");
const server = spawn(process.execPath, [wrangler, "dev", "--local", "--port", String(port), "--var", `ADMIN_AUTH_SECRET_1:${secret1}`, "--var", `ADMIN_AUTH_SECRET_2:${secret2}`, "--var", `SESSION_PEPPER:${pepper}`, "--var", "ENVIRONMENT:test"], { cwd:projectDir, env:process.env, stdio:"ignore" });
const cookies = new Map();
const check = (condition, label) => { if (!condition) throw new Error(`Échec: ${label}`); process.stdout.write(`✓ ${label}\n`); };
const req = async (path, { method="GET", body, raw=false }={}) => {
  const response = await fetch(base + path, { method, headers:{ ...(body === undefined ? {} : {"content-type":"application/json"}), "x-forwarded-for":"198.51.100.71", cookie:[...cookies].map(([key,value]) => `${key}=${value}`).join("; ") }, body:body === undefined ? undefined : JSON.stringify(body) });
  const setCookie = response.headers.get("set-cookie") || "";
  for (const match of setCookie.matchAll(/(wc_admin_(?:session|challenge))=([^;,]*)/g)) match[2] ? cookies.set(match[1], match[2]) : cookies.delete(match[1]);
  return { response, data:raw ? await response.arrayBuffer() : await response.json().catch(() => ({})) };
};
const ready = async () => {
  for (let index=0; index<150; index+=1) {
    try { if ((await fetch(`${base}/admin/connexion/`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Serveur indisponible");
};
let applicantId = null;
try {
  await ready();
  const form = new FormData();
  Object.entries({firstName:"Amine",lastName:`AdminTest-${suffix}`,email:`amine-${suffix}@example.com`,phone:"+212612345678",city:"Rabat",country:"Maroc",professionalTitle:"Technicien",domain:"it",domainOther:"",experienceLevel:"junior",availability:"immediate",motivation:"Test administration",language:"fr",consent:"true",idempotencyKey:`admin${crypto.randomUUID().replaceAll("-","")}`,answers:"{}"}).forEach(([key,value]) => form.append(key,value));
  form.append("cv", new File(["%PDF-1.4\nAdmin applicant test"], "admin-test.pdf", {type:"application/pdf"}));
  let response = await fetch(`${base}/api/v2/applicants`, {method:"POST",headers:{"x-forwarded-for":"198.51.100.72"},body:form});
  const created = await response.json();
  check(response.status === 201 && created.reference, "candidature V2 créée");
  let result = await req("/api/admin/auth/step-1", {method:"POST",body:{secret:secret1}});
  check(result.response.ok, "niveau 1 admin");
  result = await req("/api/admin/auth/step-2", {method:"POST",body:{secret:secret2}});
  check(result.response.ok, "niveau 2 admin");
  result = await req(`/api/admin/v2/applicants?q=${encodeURIComponent(suffix)}`);
  check(result.response.ok && result.data.items.length === 1, "liste et recherche postulants");
  applicantId = result.data.items[0].id;
  result = await req(`/api/admin/v2/applicants/${applicantId}`);
  check(result.response.ok && result.data.documents.length === 1, "fiche et documents postulant");
  const documentId = result.data.documents[0].id;
  result = await req(`/api/admin/v2/applicants/${applicantId}/documents/${documentId}`, {raw:true});
  check(result.response.ok && result.data.byteLength > 10, "téléchargement document protégé");
  result = await req(`/api/admin/v2/applicants/${applicantId}`, {method:"PATCH",body:{status:"reviewing",adminNotes:"Dossier vérifié"}});
  check(result.response.ok && result.data.item.status === "reviewing" && result.data.history.length === 1, "statut, notes et historique");
  process.stdout.write("V2 admin applicants integration: OK\n");
} finally {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {stdio:"ignore"}); else server.kill("SIGTERM");
  if (applicantId) spawnSync(process.execPath, [wrangler, "d1", "execute", "workcrute", "--local", "--command", `DELETE FROM v2_applicants WHERE id='${applicantId.replaceAll("'","''")}'`], {cwd:projectDir,stdio:"ignore"});
}
