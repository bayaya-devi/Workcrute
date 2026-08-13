import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const port = 8792;
const server = spawn(process.execPath, [wrangler, "dev", "--local", "--port", String(port), "--var", `SESSION_PEPPER:${randomBytes(32).toString("hex")}`, "--var", `ADMIN_AUTH_SECRET_1:A1!${randomBytes(16).toString("base64url")}`, "--var", `ADMIN_AUTH_SECRET_2:B2!${randomBytes(16).toString("base64url")}`], { cwd:projectDir, stdio:"ignore" });
const base = `http://127.0.0.1:${port}`;
const check = (condition, label) => { if (!condition) throw new Error(`Échec: ${label}`); process.stdout.write(`✓ ${label}\n`); };
try {
  for (let attempt=0;attempt<150;attempt+=1) {
    try { if ((await fetch(`${base}/admin/connexion/`)).ok) break; } catch {}
    if (attempt === 149) throw new Error("Serveur local indisponible");
    await new Promise((resolve)=>setTimeout(resolve,200));
  }
  const email=`candidate-${randomBytes(6).toString("hex")}@example.test`;
  const register=await fetch(`${base}/api/auth/register`,{method:"POST",headers:{"content-type":"application/json","x-forwarded-for":"198.51.100.50"},body:JSON.stringify({role:"candidate",email,firstName:"Test",lastName:"Document",phone:"+212600000555",password:"Strong!Pass123",confirmPassword:"Strong!Pass123",acceptedTerms:true,language:"fr"})});
  check(register.status===201,"compte candidat de test créé");
  const cookie=(register.headers.get("set-cookie")||"").match(/wc_session=([^;]+)/)?.[1];
  check(Boolean(cookie),"session candidat créée");
  const source=new Uint8Array(1024*1024+37); crypto.getRandomValues(source.subarray(0,65536));
  for(let offset=65536;offset<source.length;offset+=65536) source.set(source.subarray(0,Math.min(65536,source.length-offset)),offset);
  source.set(new TextEncoder().encode("%PDF-1.7"),0);
  const form=new FormData(); form.set("kind","cv"); form.set("file",new File([source],"cv-test.pdf",{type:"application/pdf"}));
  const upload=await fetch(`${base}/api/documents`,{method:"POST",headers:{cookie:`wc_session=${cookie}`,"x-forwarded-for":"198.51.100.50"},body:form});
  const uploaded=await upload.json(); check(upload.status===201,`document stocké par morceaux dans D1 (${upload.status}: ${uploaded.error||"ok"})`);
  const download=await fetch(`${base}/api/documents/${uploaded.document.id}/download`,{headers:{cookie:`wc_session=${cookie}`,"x-forwarded-for":"198.51.100.50"}});
  const received=new Uint8Array(await download.arrayBuffer());
  check(download.ok&&received.length===source.length&&received.every((value,index)=>value===source[index]),"document D1 téléchargé sans altération");
  const deletion=await fetch(`${base}/api/documents/${uploaded.document.id}`,{method:"DELETE",headers:{cookie:`wc_session=${cookie}`,"x-forwarded-for":"198.51.100.50"}});
  check(deletion.status===204,"document et morceaux supprimés");
  process.stdout.write("D1 document storage integration: OK\n");
} finally {
  if(process.platform==="win32") spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore"}); else server.kill("SIGTERM");
}
