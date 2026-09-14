import assert from 'node:assert/strict';
import { spawn,spawnSync } from 'node:child_process';
import { mkdtemp,readdir,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { randomBytes,createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';

const root=fileURLToPath(new URL('..',import.meta.url)),wrangler=join(root,'node_modules/wrangler/bin/wrangler.js');
const persistence=await mkdtemp(join(tmpdir(),'workcrute-billing-')),pepper=randomBytes(20).toString('hex'),port=14500+Math.floor(Math.random()*500),base=`http://127.0.0.1:${port}`;
const migrate=spawnSync(process.execPath,[wrangler,'d1','migrations','apply','workcrute','--local','--persist-to',persistence],{cwd:root,encoding:'utf8',timeout:120000});
assert.equal(migrate.status,0,migrate.stderr||migrate.stdout);
const directory=join(persistence,'v3/d1/miniflare-D1DatabaseObject'),databaseName=(await readdir(directory)).find(name=>name.endsWith('.sqlite')&&name!=='metadata.sqlite'),db=new DatabaseSync(join(directory,databaseName));
const tokens={employee:randomBytes(24).toString('hex'),other:randomBytes(24).toString('hex'),admin:randomBytes(24).toString('hex')};
for(const [id,role] of [['employee','employee'],['other','employee'],['admin','admin']]){
  db.prepare("INSERT INTO v2_accounts(id,role,first_name,last_name,first_name_normalized,last_name_normalized,password_hash,password_salt) VALUES(?,?,?,?,?,?,?,?)").run(id,role,id,'Billing Test',id,'billing test','unused','unused');
  if(role==='employee')db.prepare("INSERT INTO v2_employee_profiles(account_id,email,job_title,hire_date) VALUES(?,?,?,'2026-01-01')").run(id,id+'@example.com','Test');
  db.prepare("INSERT INTO v2_sessions(id,account_id,token_hash,expires_at) VALUES(?,?,?,datetime('now','+1 day'))").run(id,id,createHash('sha256').update(tokens[id]+pepper).digest('hex'));
}
db.close();
const server=spawn(process.execPath,[wrangler,'dev','--local','--persist-to',persistence,'--port',String(port),'--var','ENVIRONMENT:test','--var','SESSION_PEPPER:'+pepper],{cwd:root,stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=(value,label)=>{assert.ok(value,label);process.stdout.write('✓ '+label+'\n');};
const employeePath='/api/v2/employee/billing',adminPath='/api/admin/v2/billing';
async function request(path,{method='GET',body,actor='employee',pdf=false}={}){const response=await fetch(base+path,{method,headers:{cookie:'wc_v2_session='+tokens[actor],...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});return{status:response.status,data:pdf?new Uint8Array(await response.arrayBuffer()):await response.json()};}
let official;
try{
  let ready=false;for(let i=0;i<150;i++){try{if((await fetch(base+'/')).ok){ready=true;break;}}catch{}await sleep(150);}check(ready,'serveur isolé prêt');
  const settings={legal_name:'TEST Émetteur',address:'Adresse test sans données du modèle',cnif:'TEST-CNIF',ice:'TEST-ICE',fiscal_id:'TEST-IF',professional_tax:'TEST-TAX',phone:'+212600000000',email:'billing@example.com',signature:'TEST'};
  let result=await request(employeePath+'/profile',{method:'PUT',body:settings});check(result.status===200&&result.data.profile.legal_name===settings.legal_name,'coordonnées persistées');
  result=await request(employeePath+'/profile',{actor:'other'});check(result.data.profile===null,'coordonnées isolées entre employés');
  const foreignOrigin=await fetch(base+employeePath+'/profile',{method:'PUT',headers:{cookie:'wc_v2_session='+tokens.employee,'content-type':'application/json',origin:'https://untrusted.example'},body:JSON.stringify(settings)});
  check(foreignOrigin.status===403,'modification depuis une origine étrangère rejetée');
  result=await request(adminPath+'/config',{method:'PUT',actor:'admin',body:{client_name:'CALL MANAGEMENT SECURITY',client_address:'Adresse test client',admin_email:'admin@example.com',tax_mention:''}});check(result.status===200,'configuration destinataire et client');
  result=await request(employeePath+'/invoices');const period=result.data.currentPeriod;
  result=await request(employeePath+'/invoices',{method:'POST',body:{period,service:'-1'}});check(result.status===422,'montant négatif rejeté');
  result=await request(employeePath+'/invoices',{method:'POST',body:{period,service:'3300',expenses:'100',bonus:'200',other:'50',details:{other:'Divers'}}});let draft=result.data.item;check(draft.total_centimes===365000,'calcul exact sans ajout du fixe interne');
  result=await request(employeePath+'/invoices/'+draft.id,{actor:'other'});check(result.status===404,'facture inaccessible à un autre employé');
  result=await request(employeePath+'/invoices/'+draft.id+'/pdf',{actor:'other'});check(result.status===404,'PDF inaccessible à un autre employé');
  result=await request(employeePath+'/invoices/'+draft.id,{method:'PATCH',body:{revision:99,service:'3000'}});check(result.status===409,'édition concurrente rejetée');
  result=await request(employeePath+'/invoices/'+draft.id+'/submit',{method:'POST',body:{revision:draft.revision}});draft=result.data.item;check(result.status===200&&draft.status==='submitted'&&draft.reference===null,'soumission sans numéro officiel');
  result=await request(employeePath+'/profile',{method:'PUT',body:{...settings,address:'Adresse modifiée après soumission'}});check(result.status===200,'coordonnées modifiables immédiatement');
  result=await request(employeePath+'/invoices/'+draft.id);check(JSON.parse(result.data.item.issuer_json).address===settings.address,'coordonnées figées dans la facture soumise');
  result=await request(adminPath+'/invoices/'+draft.id+'/refuse',{method:'POST',actor:'admin',body:{revision:draft.revision}});check(result.status===422,'refus sans motif rejeté');
  result=await request(adminPath+'/invoices/'+draft.id+'/refuse',{method:'POST',actor:'admin',body:{revision:draft.revision,note:'Frais à corriger'}});check(result.data.item.status==='refused','refus conservé');
  result=await request(employeePath+'/invoices/'+draft.id+'/recreate',{method:'POST',body:{}});let replacement=result.data.item;check(replacement.version===2&&replacement.previous_id===draft.id,'nouvelle version liée au refus');
  result=await request(employeePath+'/invoices/'+replacement.id,{method:'PATCH',body:{revision:replacement.revision,service:'3300',expenses:'80',bonus:'200',other:'50',details:{other:'Divers'}}});replacement=result.data.item;check(replacement.total_centimes===363000,'correction enregistrée');
  result=await request(employeePath+'/invoices/'+replacement.id+'/submit',{method:'POST',body:{revision:replacement.revision}});replacement=result.data.item;check(result.status===200&&JSON.parse(replacement.issuer_json).address.includes('modifiée'),'nouvelle version utilise les nouvelles coordonnées');
  result=await request(adminPath+'/invoices/'+replacement.id+'/approve',{method:'POST',actor:'admin',body:{revision:replacement.revision}});official=result.data.item;check(result.status===200&&official.reference==='000001'&&official.status==='approved','numéro officiel uniquement à la validation');
  result=await request(adminPath+'/invoices/'+official.id+'/approve',{method:'POST',actor:'admin',body:{revision:replacement.revision}});check(result.data.item.reference===official.reference,'validation répétée sans deuxième numéro');
  result=await request(employeePath+'/invoices/'+official.id,{method:'PATCH',body:{revision:official.revision,service:'1'}});check(result.status===409,'facture officielle verrouillée');
  result=await request(employeePath+'/invoices/'+official.id+'/pdf',{pdf:true});check(result.status===200&&new TextDecoder().decode(result.data.slice(0,5))==='%PDF-','PDF officiel réel');
  await mkdir(join(root,'output/billing-qa'),{recursive:true});await writeFile(join(root,'output/billing-qa/invoice-test.pdf'),result.data);
  const originalPdf=result.data;
  await request(employeePath+'/profile',{method:'DELETE'});
  result=await request(employeePath+'/invoices/'+official.id+'/pdf',{pdf:true});check(Buffer.compare(Buffer.from(originalPdf),Buffer.from(result.data))===0,'PDF inchangé après suppression du profil');
  result=await request(adminPath+'/invoices/'+official.id+'/pay',{method:'POST',actor:'admin',body:{revision:official.revision,paidAt:period+'-20',paymentReference:'PAY-TEST'}});official=result.data.item;check(official.status==='paid','paiement enregistré');
  result=await request(employeePath+'/invoices/'+official.id);check(result.data.versions.length===2&&result.data.history.some(event=>event.event==='refused')&&result.data.history.some(event=>event.event==='paid'),'historique complet visible employé');
  const older='2026-02';result=await request(employeePath+'/invoices',{method:'POST',body:{period:older}});const deleted=result.data.item;await request(employeePath+'/invoices/'+deleted.id,{method:'DELETE',body:{revision:deleted.revision}});result=await request(employeePath+'/invoices/'+deleted.id);check(result.data.item.status==='deleted','suppression du brouillon tracée');
  result=await request(adminPath+'/invoices',{actor:'employee'});check(result.status===401,'espace admin protégé');
  result=await request('/api/v2/employee/invoice-requests',{method:'POST',body:{requestedFor:'TEST Archive',details:'Legacy QA'}});check(result.status===201,'ancienne demande toujours fonctionnelle');
  result=await request('/api/v2/employee/invoices');check(result.data.requests.length===1,'archive employé conservée');
  result=await request('/api/v2/employee/invoices',{actor:'other'});check(result.data.requests.length===0,'archives isolées entre employés');
  await request(employeePath+'/profile',{method:'PUT',body:settings});
  if(process.env.WORKCRUTE_BILLING_BROWSER==='1')await browserValidation();
}finally{if(process.platform==='win32')spawnSync('taskkill',['/pid',String(server.pid),'/T','/F'],{stdio:'ignore'});else server.kill('SIGTERM');}

// Use the same SQL against the isolated database to exercise scheduled dates and mail delivery.
const sql=new DatabaseSync(join(directory,databaseName));sql.exec('PRAGMA foreign_keys=ON');
const adapter={prepare(query){let args=[];return{bind(...values){args=values;return this;},async first(){return sql.prepare(query).get(...args)||null;},async all(){return{results:sql.prepare(query).all(...args)};},async run(){const result=sql.prepare(query).run(...args);return{meta:{changes:Number(result.changes)}};}};},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const bundle=join(persistence,'billing-test.mjs');await build({entryPoints:[join(root,'src/v2-billing.js')],bundle:true,platform:'node',target:'node20',format:'esm',outfile:bundle,loader:{'.ttf':'binary','.png':'binary'}});
const {generateBillingReminders,processBillingEmails,reminderDue}=await import(pathToFileURL(bundle));
check(reminderDue('2026-09','2026-09-24')&&!reminderDue('2026-09','2026-09-25')&&reminderDue('2026-09','2026-09-27')&&reminderDue('2026-09','2026-10-01'),'calendrier J-7, derniers jours et retard');
const delivered=[],env={DB:adapter,ENVIRONMENT:'qa',EMAIL_FROM:'test@example.com',EMAIL:{send:async mail=>delivered.push(mail)}};
sql.prepare("UPDATE v2_employee_profiles SET hire_date=?").run(official.period+'-01');
const next=new Date(official.period+'-01T12:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);next.setUTCDate(next.getUTCDate()-7);
await generateBillingReminders(env,next);const count=sql.prepare('SELECT COUNT(*) n FROM v2_billing_reminders').get().n;await generateBillingReminders(env,next);check(sql.prepare('SELECT COUNT(*) n FROM v2_billing_reminders').get().n===count,'rappels dédupliqués');
check(sql.prepare('SELECT COUNT(*) n FROM v2_billing_reminders WHERE employee_account_id=? AND period=?').get('employee',official.period).n===0,'facture payée stoppe les rappels');
check(sql.prepare('SELECT COUNT(*) n FROM v2_billing_reminders WHERE employee_account_id=? AND period=?').get('other',official.period).n===1,'employé sans facture reçoit le rappel');
check(sql.prepare('SELECT COUNT(*) n FROM v2_billing_reminders WHERE period<?').get(official.period).n===0,'aucun rappel rétroactif avant activation');
sql.prepare("UPDATE v2_billing_invoices SET status='refused' WHERE id=?").run(official.id);
await generateBillingReminders(env,next);
check(sql.prepare("SELECT COUNT(*) n FROM v2_billing_notifications WHERE employee_account_id=? AND period=? AND event='correction'").get('employee',official.period).n===1,'refus relance le rappel de correction');
sql.prepare("UPDATE v2_billing_invoices SET status='paid' WHERE id=?").run(official.id);
const overdue=new Date(official.period+'-01T12:00:00Z');overdue.setUTCMonth(overdue.getUTCMonth()+1);
await generateBillingReminders(env,overdue);overdue.setUTCDate(2);await generateBillingReminders(env,overdue);
check(sql.prepare('SELECT COUNT(*) n FROM v2_billing_reminders WHERE employee_account_id=? AND period=?').get('other',official.period).n===3,'rappels quotidiens J+1 et J+2');
await processBillingEmails(env,100);check(delivered.some(mail=>mail.attachments?.some(attachment=>attachment.filename==='facture-000001.pdf')),'PDF définitif joint à l’e-mail admin');
check(delivered.some(mail=>mail.subject.includes('Rappel')),'rappel e-mail traité');
const sentCount=delivered.length;await processBillingEmails(env,100);check(delivered.length===sentCount,'e-mails envoyés non répétés');
sql.prepare("INSERT INTO v2_billing_email_outbox(id,dedupe_key,employee_account_id,period,event,recipient) VALUES('failure-test','failure-test','other',?,'reminder','other@example.com')").run(official.period);
await processBillingEmails({...env,EMAIL:{send:async()=>{throw new Error('TEST_PROVIDER_FAILURE');}}},100);
check(sql.prepare("SELECT status,attempts FROM v2_billing_email_outbox WHERE id='failure-test'").get().status==='failed','échec du fournisseur conservé pour reprise');
const beforeRetry=delivered.length;await processBillingEmails(env,100);check(delivered.length===beforeRetry,'temporisation des e-mails en échec');
sql.prepare("UPDATE v2_billing_email_outbox SET next_attempt_at=CURRENT_TIMESTAMP WHERE id='failure-test'").run();
await processBillingEmails(env,100);check(sql.prepare("SELECT status FROM v2_billing_email_outbox WHERE id='failure-test'").get().status==='sent','reprise après échec du fournisseur');
sql.close();process.stdout.write('Monthly billing full-stack integration: OK\n');

async function browserValidation(){
  const profile=await mkdtemp(join(tmpdir(),'workcrute-billing-browser-')),debugPort=port+1000;
  const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run',`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`,'about:blank'],{stdio:'ignore'});
  let socket;const pending=new Map();let id=0;const errors=[];
  try{let target;for(let n=0;n<80;n++){try{target=(await(await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(page=>page.type==='page');if(target)break;}catch{}await sleep(100);}socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);if(message.id){const item=pending.get(message.id);pending.delete(message.id);message.error?item.reject(message.error):item.resolve(message.result);}};const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});await call('Page.enable');await call('Runtime.enable');const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    for(const actor of ['employee','admin']){await call('Network.setCookie',{name:'wc_v2_session',value:tokens[actor],url:base,path:'/'});for(const width of [320,375,390,430,768,1024,1440,1920]){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});for(const lang of ['fr','en','ar']){if(actor==='employee')await request('/api/v2/employee/settings',{method:'PATCH',body:{language:lang}});await call('Page.navigate',{url:base+(actor==='employee'?'/employe/factures/':'/admin/factures/')});for(let n=0;n<80;n++){if(await evaluate("document.readyState==='complete' && !!document.querySelector('[data-bill-list] .bill-row')"))break;await sleep(100);}if(actor==='admin'){await evaluate(`workcruteAdminI18n.apply('${lang}')`);for(let n=0;n<100;n++){if(await evaluate("!!document.querySelector('[data-detail]')"))break;await sleep(100);}}await sleep(350);check(await evaluate("!!document.querySelector('[data-detail]')"),`${actor} ${width}px ${lang} liste chargée`);check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`${actor} ${width}px ${lang} sans débordement`);await evaluate("document.querySelector('[data-detail]').click()");for(let n=0;n<80;n++){if(await evaluate("!!document.querySelector('dialog[open]')"))break;await sleep(100);}check(await evaluate("!!document.querySelector('dialog[open]')"),'historique ouvert');await sleep(200);await evaluate("document.querySelector('[data-dialog-close]').click()");check(await evaluate("!document.querySelector('dialog')"),'fermeture dialogue');const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(join(root,'output/billing-qa',`${actor}-${width}-${lang}.png`),Buffer.from(shot.data,'base64'));}}}
    const waitFor=async expression=>{for(let n=0;n<120;n++){if(await evaluate(expression))return;await sleep(100);}throw new Error('UI timeout: '+expression+' '+await evaluate('document.body.innerText'));};
    await call('Network.setCookie',{name:'wc_v2_session',value:tokens.employee,url:base,path:'/'});
    await call('Page.navigate',{url:base+'/employe/parametres/'});
    await waitFor("!!document.querySelector('[data-profile]')");
    await evaluate(`(()=>{const f=document.querySelector('[data-profile]');const values=${JSON.stringify({legal_name:'TEST Interface',address:'Adresse UI test',cnif:'UI-CNIF',ice:'UI-ICE',fiscal_id:'UI-IF',professional_tax:'UI-TAX',phone:'+212600000000',email:'ui@example.com',signature:'TEST UI'})};for(const [k,v]of Object.entries(values))f.elements[k].value=v;f.requestSubmit();})()`);
    await waitFor("document.querySelector('[data-profile] .bill-notice').textContent.length>0 && !document.querySelector('[data-profile]').dataset.busy");
    check((await request(employeePath+'/profile')).data.profile.legal_name==='TEST Interface','coordonnées enregistrées par le formulaire');
    await call('Page.navigate',{url:base+'/employe/factures/'});
    await waitFor("!!document.querySelector('[data-create]') && !!document.querySelector('[data-detail]')");
    await evaluate("(()=>{const f=document.querySelector('[data-create]');f.elements.period.value='2026-03';f.requestSubmit();})()");
    await waitFor("!!document.querySelector('[data-edit-invoice]')");
    await evaluate("(()=>{const f=document.querySelector('[data-edit-invoice]');f.elements.service.value='1234.56';f.elements.expenses.value='10';f.requestSubmit(f.querySelector('[value=submit]'));})()");
    await waitFor("!document.querySelector('dialog')");
    let uiInvoice=(await request(employeePath+'/invoices?period=2026-03')).data.items[0];
    check(uiInvoice.status==='submitted'&&uiInvoice.total_centimes===124456,'facture créée et soumise par l’interface');
    await call('Network.setCookie',{name:'wc_v2_session',value:tokens.admin,url:base,path:'/'});
    await call('Page.navigate',{url:base+'/admin/factures/?id='+uiInvoice.id});
    await waitFor("!!document.querySelector('[data-decision]')");
    await evaluate("document.querySelector('[data-decision]').requestSubmit()");
    await waitFor("!document.querySelector('dialog')");
    uiInvoice=(await request(adminPath+'/invoices/'+uiInvoice.id,{actor:'admin'})).data.item;
    check(uiInvoice.status==='approved'&&uiInvoice.reference==='000002','validation administrateur par l’interface');
    await evaluate(`document.querySelector('[data-detail="${uiInvoice.id}"]').click()`);
    await waitFor("!!document.querySelector('[data-decision]')");
    check(await evaluate("!document.querySelector('[data-payment]').hidden"),'champs paiement visibles immédiatement');
    await evaluate("(()=>{const f=document.querySelector('[data-decision]');f.elements.paidAt.value='2026-09-15';f.elements.paymentReference.value='UI-PAY';f.requestSubmit();})()");
    await waitFor("!document.querySelector('dialog')");
    check((await request(adminPath+'/invoices/'+uiInvoice.id,{actor:'admin'})).data.item.status==='paid','paiement administrateur par l’interface');
    check(errors.length===0,'aucune exception console navigateur');
  }finally{socket?.close();spawnSync('taskkill',['/pid',String(browser.pid),'/T','/F'],{stdio:'ignore'});}
}
