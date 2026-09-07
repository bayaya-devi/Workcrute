import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const legacy1=`A1!${randomBytes(18).toString("base64url")}`,legacy2=`B2!${randomBytes(18).toString("base64url")}`,password=`V2!${randomBytes(18).toString("base64url")}`,pepper=randomBytes(32).toString("hex"),port=8798,base=`http://127.0.0.1:${port}`;
const wrangler=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url)),projectDir=fileURLToPath(new URL("..",import.meta.url));
const clean=spawnSync(process.execPath,[wrangler,"d1","execute","workcrute","--local","--command","DELETE FROM v2_sessions; DELETE FROM v2_login_attempts; DELETE FROM v2_accounts; DELETE FROM admin_sessions; DELETE FROM admin_auth_challenges; DELETE FROM admin_rate_limits; UPDATE admin_security_config SET secret_1_hash=NULL,secret_1_salt=NULL,secret_2_hash=NULL,secret_2_salt=NULL WHERE id=1"],{cwd:projectDir,stdio:"ignore"});if(clean.status!==0)throw new Error("Base locale indisponible");
const server=spawn(process.execPath,[wrangler,"dev","--local","--port",String(port),"--var",`ADMIN_AUTH_SECRET_1:${legacy1}`,"--var",`ADMIN_AUTH_SECRET_2:${legacy2}`,"--var",`SESSION_PEPPER:${pepper}`,"--var","ENVIRONMENT:test"],{cwd:projectDir,env:process.env,stdio:"ignore"});
let cookies=new Map();
const check=(ok,label)=>{if(!ok)throw new Error(`Échec: ${label}`);process.stdout.write(`✓ ${label}\n`);};
async function req(path,{method="GET",body,ip="198.51.100.81"}={}){const response=await fetch(base+path,{method,headers:{...(body===undefined?{}:{"content-type":"application/json"}),"x-forwarded-for":ip,cookie:[...cookies].map(([key,value])=>`${key}=${value}`).join("; ")},body:body===undefined?undefined:JSON.stringify(body)});const set=response.headers.get("set-cookie")||"";for(const match of set.matchAll(/(wc_(?:admin_(?:session|challenge)|v2_session))=([^;,]*)/g))match[2]?cookies.set(match[1],match[2]):cookies.delete(match[1]);return{response,data:await response.json().catch(()=>({}))};}
async function ready(){for(let index=0;index<150;index+=1){try{if((await fetch(`${base}/connexion/`)).ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,200));}throw new Error("Serveur indisponible");}
try{
  await ready();
  let result=await req("/api/admin/auth/step-1",{method:"POST",body:{secret:legacy1}});check(result.response.ok,"authentification historique niveau 1");
  result=await req("/api/admin/auth/step-2",{method:"POST",body:{secret:legacy2}});check(result.response.ok,"authentification historique niveau 2");
  result=await req("/api/admin/v2/account",{method:"PUT",body:{firstName:"Control",lastName:"Workcrute",password}});check(result.response.ok,"configuration administrateur V2");
  cookies=new Map();
  result=await req("/api/v2/auth/login",{method:"POST",body:{firstName:"control",lastName:"workcrute",password}});check(result.response.ok&&result.data.account.role==="admin"&&result.data.redirect==="/admin/tableau-de-bord/","connexion publique et identification du rôle");
  result=await req("/api/admin/auth/me");check(result.response.ok,"session V2 acceptée par le Control Center");
  result=await req("/api/v2/auth/logout",{method:"POST",body:{}});check(result.response.ok,"déconnexion V2");
  result=await req("/api/admin/auth/me");check(result.response.status===401,"session V2 révoquée");
  for(let index=0;index<5;index+=1)await req("/api/v2/auth/login",{method:"POST",body:{firstName:"Control",lastName:"Workcrute",password:"incorrect"},ip:"198.51.100.82"});
  result=await req("/api/v2/auth/login",{method:"POST",body:{firstName:"Control",lastName:"Workcrute",password:"incorrect"},ip:"198.51.100.82"});check(result.response.status===429,"limitation des tentatives");
  process.stdout.write("V2 authentication integration: OK\n");
}finally{if(process.platform==="win32")spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore"});else server.kill("SIGTERM");}
