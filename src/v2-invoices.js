import { requireV2Session } from "./v2-auth.js";

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const bad=(userMessage,status=400)=>json({userMessage},status);
const clean=(value,max)=>typeof value==="string"&&value.trim().length<=max?value.trim():"";

export async function employeeInvoices(env,accountId){
  const [invoices,requests]=await Promise.all([
    env.DB.prepare("SELECT id,reference,status,document_url,issued_at FROM v2_employee_invoices WHERE employee_account_id=? ORDER BY issued_at DESC LIMIT 100").bind(accountId).all(),
    env.DB.prepare("SELECT id,requested_for,details,status,admin_note,created_at,updated_at FROM v2_invoice_requests WHERE employee_account_id=? ORDER BY created_at DESC LIMIT 100").bind(accountId).all(),
  ]);
  return {items:invoices.results||[],requests:requests.results||[]};
}

export async function v2Invoices(request,env,path,adminAuthorized=false){
  if(path.startsWith("/api/admin/")){
    if(!adminAuthorized)return bad("Accès refusé.",403);
    if(path==="/api/admin/v2/invoice-requests"&&request.method==="GET"){
      const {results=[]}=await env.DB.prepare("SELECT r.*,a.first_name,a.last_name,p.job_title FROM v2_invoice_requests r JOIN v2_accounts a ON a.id=r.employee_account_id JOIN v2_employee_profiles p ON p.account_id=a.id ORDER BY CASE r.status WHEN 'pending' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END,r.created_at DESC LIMIT 200").all();
      return json({items:results});
    }
    return bad("Action non prise en charge.",405);
  }
  const session=await requireV2Session(request,env,["employee"]);
  if(path==="/api/v2/employee/invoices"&&request.method==="GET")return json(await employeeInvoices(env,session.account_id));
  if(path==="/api/v2/employee/invoice-requests"&&request.method==="POST"){
    const body=await request.json().catch(()=>({}));
    const requestedFor=clean(body.requestedFor,160),details=clean(body.details,2000);
    if(!requestedFor)return bad("L'objet de la demande est obligatoire.",422);
    const id=crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO v2_invoice_requests(id,employee_account_id,requested_for,details) VALUES(?,?,?,?)").bind(id,session.account_id,requestedFor,details||null),
      env.DB.prepare("INSERT INTO admin_notifications(id,category,title,body,severity,href) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(),"invoices","Nouvelle demande de facture",`${session.first_name} ${session.last_name} - ${requestedFor}`,"info","/admin/tableau-de-bord/#invoice-requests"),
    ]);
    return json({id},201);
  }
  return bad("Action non prise en charge.",405);
}
