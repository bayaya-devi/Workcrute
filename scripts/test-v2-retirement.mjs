import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const port=8801,base=`http://127.0.0.1:${port}`,root=fileURLToPath(new URL("..",import.meta.url)),wrangler=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url));
const server=spawn(process.execPath,[wrangler,"dev","--local","--port",String(port),"--var","ENVIRONMENT:test"],{cwd:root,stdio:"ignore"});
const check=(ok,label)=>{if(!ok)throw new Error(`Échec: ${label}`);process.stdout.write(`✓ ${label}\n`);};
async function ready(){for(let index=0;index<150;index+=1){try{if((await fetch(base+"/api/faq")).ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,200));}throw new Error("Serveur indisponible");}
try{
  await ready();
  let response=await fetch(base+"/api/faq"),data=await response.json();
  check(response.ok&&data.items.length>=6&&data.items.every(item=>item.id.startsWith("v2-")),"FAQ publique limitée au modèle V2");
  response=await fetch(base+"/api/chatbot/ask",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:"Comment envoyer mon CV ?",language:"fr"})});data=await response.json();
  check(response.ok&&data.matched&&/CV|candidature/i.test(data.answer),"chatbot aligné sur le dépôt sans compte");
  response=await fetch(base+"/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
  check(response.status===410,"ancienne inscription fermée côté serveur");
  process.stdout.write("V2 legacy retirement integration: OK\n");
}finally{if(process.platform==="win32")spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore"});else server.kill("SIGTERM");}
