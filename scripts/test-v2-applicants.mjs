import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const port=8787,base=process.env.WORKCRUTE_URL||`http://127.0.0.1:${port}`,root=fileURLToPath(new URL("..",import.meta.url)),wrangler=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url));
const server=process.env.WORKCRUTE_URL?null:spawn(process.execPath,[wrangler,"dev","--local","--port",String(port),"--var","ENVIRONMENT:test"],{cwd:root,stdio:"ignore"});
const key=`test${crypto.randomUUID().replaceAll("-","")}`,email=`nadia.${key}@example.com`;
const form=()=>{const data=new FormData(),fields={firstName:"Nadia",lastName:"Test",email,phone:"+212612345678",city:"Casablanca",country:"Maroc",professionalTitle:"Responsable qualité",domain:"industry",domainOther:"",experienceLevel:"confirmed",availability:"one_month",motivation:"Candidature de validation automatisée.",language:"fr",consent:"true",idempotencyKey:key,answers:JSON.stringify({workModes:["onsite","hybrid"]})};Object.entries(fields).forEach(([name,value])=>data.append(name,value));data.append("cv",new File(["%PDF-1.4\n% Workcrute integration test"],"cv-test.pdf",{type:"application/pdf"}));return data;};
async function ready(){if(process.env.WORKCRUTE_URL)return;for(let index=0;index<150;index+=1){try{if((await fetch(`${base}/connexion/`)).ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,200));}throw new Error("Serveur indisponible");}
try{
  await ready();
  const first=await fetch(`${base}/api/v2/applicants`,{method:"POST",body:form()}),firstBody=await first.json();
  if(first.status!==201||!/^WC-\d{6}-[A-Z0-9]{6}$/.test(firstBody.reference||""))throw new Error(`Initial submission failed: ${first.status} ${JSON.stringify(firstBody)}`);
  const repeated=await fetch(`${base}/api/v2/applicants`,{method:"POST",body:form()}),repeatedBody=await repeated.json();
  if(repeated.status!==200||repeatedBody.reference!==firstBody.reference)throw new Error(`Idempotency failed: ${repeated.status} ${JSON.stringify(repeatedBody)}`);
  const invalid=new FormData();invalid.append("idempotencyKey",`invalid${crypto.randomUUID().replaceAll("-","")}`);
  const invalidResponse=await fetch(`${base}/api/v2/applicants`,{method:"POST",body:invalid}),invalidBody=await invalidResponse.json();
  if(invalidResponse.status!==422||invalidBody.code!=="VALIDATION_ERROR")throw new Error(`Validation failed: ${invalidResponse.status} ${JSON.stringify(invalidBody)}`);
  console.log(JSON.stringify({ok:true,reference:firstBody.reference,idempotency:true,validation:true}));
}finally{if(server){if(process.platform==="win32")spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore"});else server.kill("SIGTERM");}}
