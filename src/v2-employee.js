import { hashV2Password, requireV2Session, verifyV2Password } from "./v2-auth.js";
import { employeeLeaveSummary } from "./v2-leave.js";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const bad=(message,status=400)=>json({userMessage:message},status);
export async function v2Employee(request,env,path){
  const session=await requireV2Session(request,env,["employee"]);
  if(path==="/api/v2/employee/overview"&&request.method==="GET"){
    const profile=await env.DB.prepare("SELECT a.id,a.first_name,a.last_name,a.preferred_language,a.last_login_at,p.email,p.phone,p.job_title,p.department,p.hire_date FROM v2_accounts a JOIN v2_employee_profiles p ON p.account_id=a.id WHERE a.id=?").bind(session.account_id).first();
    const [leave,invoices]=await Promise.all([employeeLeaveSummary(env,session.account_id),env.DB.prepare("SELECT id,period,reference,status,total_centimes,created_at FROM v2_billing_invoices WHERE employee_account_id=? AND status<>'deleted' ORDER BY period DESC,version DESC").bind(session.account_id).all()]);
    return json({profile,leave,invoices:{count:invoices.results.length,recent:invoices.results.slice(0,1),requests:[]}});
  }
  if(path==="/api/v2/employee/settings"){
    if(request.method==="GET"){
      const preferences=await env.DB.prepare("SELECT email_enabled,leave_email_enabled,invoice_email_enabled,reminder_email_enabled FROM v2_employee_notification_preferences WHERE account_id=?").bind(session.account_id).first();
      return json({language:session.preferred_language,preferences:preferences||{email_enabled:1,leave_email_enabled:1,invoice_email_enabled:1,reminder_email_enabled:1}});
    }
    if(request.method==="PATCH"){
      const body=await request.json().catch(()=>({}));
      const language=body.language===undefined?session.preferred_language:body.language;
      if(!["fr","en","ar"].includes(language))return bad("Langue invalide.",422);
      const preferences=body.preferences;
      if(preferences!==undefined){
        const flags=["emailEnabled","leaveEmailEnabled","invoiceEmailEnabled","reminderEmailEnabled"];
        if(!preferences||typeof preferences!=="object"||flags.some(key=>typeof preferences[key]!=="boolean"))return bad("Préférences invalides.",422);
      }
      const changingPassword=body.currentPassword!==undefined||body.newPassword!==undefined;
      if(changingPassword){
        if(typeof body.currentPassword!=="string"||typeof body.newPassword!=="string"||!body.currentPassword||!body.newPassword||body.currentPassword.length>256||body.newPassword.length>256)return bad("Les deux mots de passe sont obligatoires.",422);
        const account=await env.DB.prepare("SELECT password_hash,password_salt FROM v2_accounts WHERE id=?").bind(session.account_id).first();
        if(!(await verifyV2Password(body.currentPassword,account)).valid)return bad("Le mot de passe actuel est incorrect.",422);
        const salt=crypto.randomUUID()+crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare("UPDATE v2_accounts SET preferred_language=?,password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(language,await hashV2Password(body.newPassword,salt),salt,session.account_id),
          env.DB.prepare("UPDATE v2_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE account_id=? AND id<>?").bind(session.account_id,session.session_id),
        ]);
      }else{
        await env.DB.prepare("UPDATE v2_accounts SET preferred_language=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(language,session.account_id).run();
      }
      if(preferences!==undefined){
        await env.DB.prepare("INSERT INTO v2_employee_notification_preferences(account_id,email_enabled,leave_email_enabled,invoice_email_enabled,reminder_email_enabled) VALUES(?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET email_enabled=excluded.email_enabled,leave_email_enabled=excluded.leave_email_enabled,invoice_email_enabled=excluded.invoice_email_enabled,reminder_email_enabled=excluded.reminder_email_enabled,updated_at=CURRENT_TIMESTAMP").bind(session.account_id,preferences.emailEnabled?1:0,preferences.leaveEmailEnabled?1:0,preferences.invoiceEmailEnabled?1:0,preferences.reminderEmailEnabled?1:0).run();
      }
      return json({ok:true,language});
    }
  }
  return bad("Action non prise en charge.",405);
}
