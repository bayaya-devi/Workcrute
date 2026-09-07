import { requireV2Session } from "./v2-auth.js";
const ALLOWANCE=21,statuses=new Set(["approved","refused"]);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const bad=(message,status=400)=>json({userMessage:message},status);
const clean=(value,max=1000)=>{const result=typeof value==="string"?value.trim():"";return result.length<=max?result:"";};
const validDate=(value)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+"T00:00:00Z"));
async function workingDays(env,start,end){
  if(!validDate(start)||!validDate(end)||start>end||start.slice(0,4)!==end.slice(0,4))throw bad("Les dates doivent être valides et appartenir à la même année.",422);
  const startDate=new Date(start+"T00:00:00Z"),endDate=new Date(end+"T00:00:00Z"),span=Math.round((endDate-startDate)/86400000);
  if(span>366)throw bad("La période est trop longue.",422);
  const {results=[]}=await env.DB.prepare("SELECT holiday_date FROM v2_holidays WHERE holiday_date BETWEEN ? AND ?").bind(start,end).all(),holidays=new Set(results.map(row=>row.holiday_date));let total=0;
  for(let cursor=new Date(startDate);cursor<=endDate;cursor.setUTCDate(cursor.getUTCDate()+1)){const day=cursor.getUTCDay(),date=cursor.toISOString().slice(0,10);if(day!==0&&day!==6&&!holidays.has(date))total+=1;}
  if(!total)throw bad("Cette période ne contient aucun jour ouvrable.",422);return total;
}
async function balance(env,accountId,year){
  const used=await env.DB.prepare("SELECT COALESCE(SUM(working_days),0) total FROM v2_leave_requests WHERE employee_account_id=? AND status='approved' AND substr(start_date,1,4)=?").bind(accountId,String(year)).first();
  const pending=await env.DB.prepare("SELECT COALESCE(SUM(working_days),0) total,COUNT(*) count FROM v2_leave_requests WHERE employee_account_id=? AND status='pending' AND substr(start_date,1,4)=?").bind(accountId,String(year)).first();
  return{year:Number(year),allowance:ALLOWANCE,used:Number(used?.total||0),remaining:Math.max(0,ALLOWANCE-Number(used?.total||0)),pendingDays:Number(pending?.total||0),pending:Number(pending?.count||0)};
}
export async function employeeLeaveSummary(env,accountId){
  const year=new Date().getUTCFullYear(),summary=await balance(env,accountId,year),{results=[]}=await env.DB.prepare("SELECT id,start_date,end_date,working_days,status,employee_comment,admin_comment,created_at FROM v2_leave_requests WHERE employee_account_id=? ORDER BY created_at DESC LIMIT 5").bind(accountId).all();return{...summary,recent:results};
}
async function employeeLeave(request,env,path){
  const session=await requireV2Session(request,env,["employee"]);
  if(path==="/api/v2/employee/leave"&&request.method==="GET"){const summary=await employeeLeaveSummary(env,session.account_id),all=await env.DB.prepare("SELECT * FROM v2_leave_requests WHERE employee_account_id=? ORDER BY created_at DESC").bind(session.account_id).all();return json({summary,items:all.results||[]});}
  if(path==="/api/v2/employee/leave"&&request.method==="POST"){
    const body=await request.json().catch(()=>({})),start=clean(body.startDate,10),end=clean(body.endDate,10),days=await workingDays(env,start,end),year=start.slice(0,4);
    const overlap=await env.DB.prepare("SELECT id FROM v2_leave_requests WHERE employee_account_id=? AND status IN ('pending','approved') AND start_date<=? AND end_date>=?").bind(session.account_id,end,start).first();if(overlap)return bad("Une demande existante chevauche cette période.",409);
    const current=await balance(env,session.account_id,year);if(days>current.remaining)return bad("Le solde disponible est insuffisant.",409);
    const id=crypto.randomUUID();await env.DB.batch([env.DB.prepare("INSERT INTO v2_leave_requests(id,employee_account_id,start_date,end_date,working_days,employee_comment) VALUES(?,?,?,?,?,?)").bind(id,session.account_id,start,end,days,clean(body.comment)||null),env.DB.prepare("INSERT INTO admin_notifications(id,category,title,body,severity,href) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(),"applications","Nouvelle demande de congé",`${session.first_name} ${session.last_name} - ${days} jour(s)`,"info","/admin/conges/")]);return json({id,workingDays:days},201);
  }
  const cancel=path.match(/^\/api\/v2\/employee\/leave\/([^/]+)\/cancel$/);if(cancel&&request.method==="POST"){const result=await env.DB.prepare("UPDATE v2_leave_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND employee_account_id=? AND status='pending'").bind(cancel[1],session.account_id).run();return result.meta?.changes?json({ok:true}):bad("Cette demande ne peut plus être annulée.",409);}
  return bad("Action non prise en charge.",405);
}
async function adminLeave(request,env,path){
  if(path==="/api/admin/v2/leave"&&request.method==="GET"){const url=new URL(request.url),status=clean(url.searchParams.get("status"),20),where=["pending","approved","refused","cancelled"].includes(status)?"WHERE r.status=?":"",query=`SELECT r.*,a.first_name,a.last_name,p.job_title FROM v2_leave_requests r JOIN v2_accounts a ON a.id=r.employee_account_id JOIN v2_employee_profiles p ON p.account_id=a.id ${where} ORDER BY r.created_at DESC LIMIT 300`,result=where?await env.DB.prepare(query).bind(status).all():await env.DB.prepare(query).all();return json({items:result.results||[]});}
  if(path==="/api/admin/v2/holidays"&&request.method==="GET"){const {results=[]}=await env.DB.prepare("SELECT * FROM v2_holidays ORDER BY holiday_date").all();return json({items:results});}
  if(path==="/api/admin/v2/holidays"&&request.method==="POST"){const body=await request.json().catch(()=>({})),date=clean(body.date,10),label=clean(body.label,120);if(!validDate(date)||!label)return bad("Date et libellé obligatoires.",422);await env.DB.prepare("INSERT INTO v2_holidays(holiday_date,label) VALUES(?,?) ON CONFLICT(holiday_date) DO UPDATE SET label=excluded.label").bind(date,label).run();return json({ok:true},201);}
  const holiday=path.match(/^\/api\/admin\/v2\/holidays\/(\d{4}-\d{2}-\d{2})$/);if(holiday&&request.method==="DELETE"){await env.DB.prepare("DELETE FROM v2_holidays WHERE holiday_date=?").bind(holiday[1]).run();return new Response(null,{status:204});}
  const match=path.match(/^\/api\/admin\/v2\/leave\/([^/]+)$/);if(match&&request.method==="PATCH"){const current=await env.DB.prepare("SELECT * FROM v2_leave_requests WHERE id=?").bind(match[1]).first();if(!current)return bad("Demande introuvable.",404);if(current.status!=="pending")return bad("Cette demande a déjà été traitée.",409);const body=await request.json().catch(()=>({})),next=clean(body.status,20);if(!statuses.has(next))return bad("Décision invalide.",422);const days=await workingDays(env,current.start_date,current.end_date);if(next==="approved"){const currentBalance=await balance(env,current.employee_account_id,current.start_date.slice(0,4));if(days>currentBalance.remaining)return bad("Le solde disponible est insuffisant.",409);}await env.DB.prepare("UPDATE v2_leave_requests SET status=?,working_days=?,admin_comment=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(next,days,clean(body.adminComment)||null,current.id).run();return json({ok:true});}
  return bad("Action non prise en charge.",405);
}
export async function v2Leave(request,env,path,adminAuthorized=false){return path.startsWith("/api/admin/")&&adminAuthorized?adminLeave(request,env,path):employeeLeave(request,env,path);}
