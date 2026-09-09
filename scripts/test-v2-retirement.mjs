import { spawn, spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const port=8801,base=`http://127.0.0.1:${port}`,root=fileURLToPath(new URL("..",import.meta.url)),wrangler=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url));
const server=spawn(process.execPath,[wrangler,"dev","--local","--port",String(port),"--var","ENVIRONMENT:test"],{cwd:root,stdio:"ignore"});
const check=(ok,label)=>{if(!ok)throw new Error(`Échec: ${label}`);process.stdout.write(`✓ ${label}\n`);};
const legacyRoots=["offres","candidats","recruteurs","inscription","demandeur","recruteur","mot-de-passe-oublie"];
const forbidden=/Je recrute|Trouver un emploi|Dernières offres publiées|Créer mon profil|Publiez une offre|Matching transparent/;
async function htmlFiles(directory){const entries=await readdir(directory,{withFileTypes:true}),files=[];for(const entry of entries){const path=join(directory,entry.name);if(entry.isDirectory())files.push(...await htmlFiles(path));else if(entry.name.endsWith(".html"))files.push(path);}return files;}
async function ready(){for(let index=0;index<150;index+=1){try{if((await fetch(base+"/api/faq")).ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,200));}throw new Error("Serveur indisponible");}
try{
  const legacyFiles=(await Promise.all(legacyRoots.map(path=>htmlFiles(join(root,"public",path))))).flat();
  const legacyDocuments=await Promise.all(legacyFiles.map(path=>readFile(path,"utf8")));
  check(legacyFiles.length===39,"inventaire complet des anciennes pages");
  check(legacyDocuments.every(html=>html.includes('name="workcrute-redirect"')&&!forbidden.test(html)),"anciens HTML réduits à une redirection V2");
  check(legacyDocuments.every((html,index)=>{const target=html.match(/name="workcrute-redirect" content="([^"]+)"/)?.[1];const page=legacyFiles[index].slice(join(root,"public").length+1).split("\\").join("/");const resolved=new URL(target,`https://bayaya-devi.github.io/Workcrute/${page}`);return resolved.pathname==="/Workcrute/"||resolved.pathname==="/Workcrute/connexion/";}),"redirections relatives compatibles avec le sous-chemin GitHub Pages");
  const redirects=await readFile(join(root,"public","_redirects"),"utf8"),headers=await readFile(join(root,"public","_headers"),"utf8");
  check(legacyRoots.every(path=>redirects.includes(`/${path} `)&&redirects.includes(`/${path}/* `)),"routes Cloudflare exactes et imbriquées redirigées");
  check(/\/\*\.html\r?\n\s+Cache-Control: public, max-age=0, must-revalidate/.test(headers)&&/\/\*\.js\r?\n\s+Cache-Control: public, max-age=0, must-revalidate/.test(headers),"shell public revalidé sans cache durable");
  await ready();
  const retiredResponses=await Promise.all(["/offres","/offres/detail/","/candidats/","/recruteurs/","/inscription/","/demandeur/tableau-de-bord/","/recruteur/tableau-de-bord/","/mot-de-passe-oublie/"].map(path=>fetch(base+path,{redirect:"manual"})));
  check(retiredResponses.every(response=>response.status===302),"anciennes routes redirigées par Cloudflare sans servir leur HTML");
  let response=await fetch(base+"/api/faq"),data=await response.json();
  check(response.ok&&data.items.length>=6&&data.items.every(item=>item.id.startsWith("v2-")),"FAQ publique limitée au modèle V2");
  response=await fetch(base+"/api/chatbot/ask",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:"Comment envoyer mon CV ?",language:"fr"})});data=await response.json();
  check(response.ok&&data.matched&&/CV|candidature/i.test(data.answer),"chatbot aligné sur le dépôt sans compte");
  response=await fetch(base+"/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
  check(response.status===410,"ancienne inscription fermée côté serveur");
  process.stdout.write("V2 legacy retirement integration: OK\n");
}finally{if(process.platform==="win32")spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore"});else server.kill("SIGTERM");}
