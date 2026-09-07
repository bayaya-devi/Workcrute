const encoder = new TextEncoder();
const json = (data, status = 200) => new Response(JSON.stringify(data), {status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const bad = (message, status = 400) => json({userMessage:message},status);
const clean = (value,max=160) => { const result=typeof value==="string"?value.trim():"";return result.length<=max?result:""; };
const normalize = (value) => clean(value,100).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr").replace(/\s+/g," ");
const token = () => { const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=",""); };
async function hash(password,salt){const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:encoder.encode(salt),iterations:100000,hash:"SHA-256"},key,256);return btoa(String.fromCharCode(...new Uint8Array(bits)));}
const publicFields = "a.id,a.first_name,a.last_name,a.account_status,a.preferred_language,a.last_login_at,a.created_at,p.email,p.phone,p.job_title,p.department,p.hire_date";

async function listEmployees(request,env){
  const url=new URL(request.url),q=clean(url.searchParams.get("q"),120),status=["active","disabled"].includes(url.searchParams.get("status"))?url.searchParams.get("status"):"";
  const filters=["a.role='employee'"],binds=[];
  if(q){filters.push("(a.first_name LIKE ? OR a.last_name LIKE ? OR p.email LIKE ? OR p.job_title LIKE ?)");for(let index=0;index<4;index+=1)binds.push(`%${q}%`);}
  if(status){filters.push("a.account_status=?");binds.push(status);}
  const {results=[]}=await env.DB.prepare(`SELECT ${publicFields} FROM v2_accounts a JOIN v2_employee_profiles p ON p.account_id=a.id WHERE ${filters.join(" AND ")} ORDER BY a.created_at DESC LIMIT 200`).bind(...binds).all();
  return json({items:results});
}
async function detail(env,id){const item=await env.DB.prepare(`SELECT ${publicFields} FROM v2_accounts a JOIN v2_employee_profiles p ON p.account_id=a.id WHERE a.id=? AND a.role='employee'`).bind(id).first();return item?json({item}):bad("Employé introuvable.",404);}
async function uniqueIdentity(env,firstName,lastName,exclude=""){return env.DB.prepare("SELECT id FROM v2_accounts WHERE first_name_normalized=? AND last_name_normalized=? AND id<>?").bind(normalize(firstName),normalize(lastName),exclude).first();}
async function create(request,env){
  const body=await request.json().catch(()=>({})),firstName=clean(body.firstName,100),lastName=clean(body.lastName,100),password=typeof body.password==="string"?body.password:"",jobTitle=clean(body.jobTitle,160);
  if(!firstName||!lastName||!password||password.length>256||!jobTitle)return bad("Nom, prénom, mot de passe et fonction sont obligatoires.",422);
  if(await uniqueIdentity(env,firstName,lastName))return bad("Cette identité de connexion est déjà utilisée.",409);
  const id=crypto.randomUUID(),salt=token();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO v2_accounts(id,role,first_name,last_name,first_name_normalized,last_name_normalized,password_hash,password_salt,preferred_language) VALUES(?,'employee',?,?,?,?,?,?,?)").bind(id,firstName,lastName,normalize(firstName),normalize(lastName),await hash(password,salt),salt,["fr","en","ar"].includes(body.language)?body.language:"fr"),
    env.DB.prepare("INSERT INTO v2_employee_profiles(account_id,email,phone,job_title,department,hire_date) VALUES(?,?,?,?,?,?)").bind(id,clean(body.email,254)||null,clean(body.phone,40)||null,jobTitle,clean(body.department,120)||null,clean(body.hireDate,10)||null)
  ]);
  return json({id},201);
}
async function update(request,env,id){
  const current=await env.DB.prepare("SELECT a.*,p.email,p.phone,p.job_title,p.department,p.hire_date FROM v2_accounts a JOIN v2_employee_profiles p ON p.account_id=a.id WHERE a.id=? AND a.role='employee'").bind(id).first();
  if(!current)return bad("Employé introuvable.",404);
  const body=await request.json().catch(()=>({})),firstName=clean(body.firstName,100)||current.first_name,lastName=clean(body.lastName,100)||current.last_name,jobTitle=clean(body.jobTitle,160)||current.job_title,password=typeof body.password==="string"?body.password:"";
  if(await uniqueIdentity(env,firstName,lastName,id))return bad("Cette identité de connexion est déjà utilisée.",409);
  const statements=[
    env.DB.prepare("UPDATE v2_accounts SET first_name=?,last_name=?,first_name_normalized=?,last_name_normalized=?,preferred_language=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(firstName,lastName,normalize(firstName),normalize(lastName),["fr","en","ar"].includes(body.language)?body.language:current.preferred_language,id),
    env.DB.prepare("UPDATE v2_employee_profiles SET email=?,phone=?,job_title=?,department=?,hire_date=?,updated_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(clean(body.email,254)||null,clean(body.phone,40)||null,jobTitle,clean(body.department,120)||null,clean(body.hireDate,10)||null,id)
  ];
  if(password){if(password.length>256)return bad("Mot de passe invalide.",422);const salt=token();statements.push(env.DB.prepare("UPDATE v2_accounts SET password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(await hash(password,salt),salt,id),env.DB.prepare("UPDATE v2_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(id));}
  await env.DB.batch(statements);return detail(env,id);
}
async function status(env,id,next){const result=await env.DB.prepare("UPDATE v2_accounts SET account_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND role='employee'").bind(next,id).run();if(!result.meta?.changes)return bad("Employé introuvable.",404);if(next==="disabled")await env.DB.prepare("UPDATE v2_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(id).run();return json({ok:true});}

export async function adminV2Employees(request,env,path){
  if(path==="/api/admin/v2/employees"){if(request.method==="GET")return listEmployees(request,env);if(request.method==="POST")return create(request,env);}
  const match=path.match(/^\/api\/admin\/v2\/employees\/([^/]+)(?:\/(activate|disable))?$/);if(!match)return bad("Action non prise en charge.",405);
  const [,id,action]=match;if(action&&request.method==="POST")return status(env,id,action==="activate"?"active":"disabled");if(request.method==="GET")return detail(env,id);if(request.method==="PATCH")return update(request,env,id);return bad("Action non prise en charge.",405);
}
