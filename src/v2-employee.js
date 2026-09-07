import { requireV2Session } from "./v2-auth.js";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const bad=(message,status=400)=>json({userMessage:message},status);
export async function v2Employee(request,env,path){
  const session=await requireV2Session(request,env,["employee"]);
  if(path==="/api/v2/employee/overview"&&request.method==="GET"){
    const profile=await env.DB.prepare("SELECT a.id,a.first_name,a.last_name,a.preferred_language,a.last_login_at,p.email,p.phone,p.job_title,p.department,p.hire_date FROM v2_accounts a JOIN v2_employee_profiles p ON p.account_id=a.id WHERE a.id=?").bind(session.account_id).first();
    return json({profile,leave:{annualAllowance:21,remaining:null,pending:0,recent:[]},invoices:{count:0,recent:[]}});
  }
  if(path==="/api/v2/employee/settings"){
    if(request.method==="GET")return json({language:session.preferred_language});
    if(request.method==="PATCH"){
      const body=await request.json().catch(()=>({}));if(!["fr","en","ar"].includes(body.language))return bad("Langue invalide.",422);
      await env.DB.prepare("UPDATE v2_accounts SET preferred_language=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.language,session.account_id).run();
      return json({ok:true,language:body.language});
    }
  }
  return bad("Action non prise en charge.",405);
}
