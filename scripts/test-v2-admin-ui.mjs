import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { executeLocalSql } from "./local-d1.mjs";

const root=fileURLToPath(new URL("..",import.meta.url)),wrangler=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url)),chrome="C:/Program Files/Google/Chrome/Application/chrome.exe",serverPort=12000+Math.floor(Math.random()*2000),chromePort=serverPort+3000,base=process.env.WORKCRUTE_UI_URL || `http://127.0.0.1:${serverPort}`,profile=await mkdtemp(join(tmpdir(),"workcrute-chrome-"));
const server=spawn(process.execPath,[wrangler,"dev","--local","--port",String(serverPort),"--var","ENVIRONMENT:test","--var","ADMIN_AUTH_SECRET_1:admin-ui-one","--var","ADMIN_AUTH_SECRET_2:admin-ui-two","--var","SESSION_PEPPER:admin-ui-test-pepper"],{cwd:root,stdio:["ignore","pipe","pipe"]}),browser=spawn(chrome,["--headless=new","--disable-gpu","--no-first-run","--disable-extensions","--no-proxy-server",`--user-data-dir=${profile}`,`--remote-debugging-port=${chromePort}`,"about:blank"],{stdio:"ignore"});
let serverLog='';
server.stdout.on('data', chunk => {serverLog=(serverLog+chunk).slice(-12000);});
server.stderr.on('data', chunk => {serverLog=(serverLog+chunk).slice(-12000);});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timedFetch=(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(1500)});
async function json(url){for(let index=0;index<30;index+=1){try{return await (await timedFetch(url)).json();}catch{}await sleep(150);}throw new Error(`Indisponible: ${url}`);}
let socket,nextId=0;const errors=[];const pending=new Map();
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP sans réponse: ${method}`));},30000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
try{
  let ready=false;for(let index=0;index<150;index+=1){try{if((await timedFetch(`${base}/`)).ok){ready=true;break;}}catch{}await sleep(150);}if(!ready)throw new Error("Serveur local indisponible.");
  const pages=await json(`http://127.0.0.1:${chromePort}/json/list`);socket=new WebSocket(pages.find(page=>page.type==="page"&&!page.url.startsWith("chrome-extension://")).webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const value=JSON.parse(event.data);if(value.method==="Runtime.exceptionThrown")errors.push(value.params.exceptionDetails);if(!value.id)return;const item=pending.get(value.id);pending.delete(value.id);value.error?item.reject(new Error(value.error.message)):item.resolve(value.result);});
  await call("Page.enable");await call("Runtime.enable");
  if(process.env.WORKCRUTE_ADMIN_PASSWORD) {
    const response=await fetch(base+'/api/v2/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({firstName:process.env.WORKCRUTE_ADMIN_FIRST_NAME,lastName:process.env.WORKCRUTE_ADMIN_LAST_NAME,password:process.env.WORKCRUTE_ADMIN_PASSWORD})});
    if(!response.ok)throw new Error('Production admin authentication '+response.status);
    for(const set of response.headers.getSetCookie()){const [name,...value]=set.split(';')[0].split('=');await call('Network.setCookie',{name,value:value.join('='),url:base,path:'/',secure:true,httpOnly:true});}
  } else {
  executeLocalSql("DELETE FROM admin_rate_limits; DELETE FROM admin_auth_challenges; UPDATE admin_security_config SET secret_1_hash=NULL,secret_1_salt=NULL,secret_2_hash=NULL,secret_2_salt=NULL WHERE id=1");
  let cookie="";
  for (const [step,secret] of [[1,"admin-ui-one"],[2,"admin-ui-two"]]) {
    const response=await fetch(base+"/api/admin/auth/step-"+step,{method:"POST",headers:{"content-type":"application/json",cookie},body:JSON.stringify({secret})});
    if(!response.ok)throw new Error("Admin UI authentication "+response.status);
    const set=response.headers.get("set-cookie") || "";
    cookie += (cookie?"; ":"") + set.split(";")[0];
    const [name,...value]=set.split(";")[0].split("=");
    await call("Network.setCookie",{name,value:value.join("="),url:base,path:"/"});
  }


  }
  async function navigate(route) {
    const response = await fetch(base + route, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${route}`);
    const navigation=await call("Page.navigate", { url: base + route });
    if(navigation.errorText)throw new Error(`Navigation ${route}: ${navigation.errorText}\n${serverLog}`);
    for (let attempt=0; attempt<80; attempt++) {
      const result=await call("Runtime.evaluate", {expression:`location.pathname === "${route}" && document.readyState === "complete" && !!window.workcruteAdminI18n && !!document.querySelector('.adm-topbar')`,returnByValue:true});
      if (result.result?.value) return;
      if (attempt === 20) {
        const current = await call("Runtime.evaluate", {expression:"location.href", returnByValue:true});
        if (current.result?.value === "chrome-error://chromewebdata/") {
          await call("Page.navigate", {url:base + route});
        }
      }
      await sleep(100);
    }
    const result=await call("Runtime.evaluate",{expression:"document.documentElement.outerHTML",returnByValue:true});
    const url=await call("Runtime.evaluate",{expression:"location.href",returnByValue:true});
    throw new Error("Page not ready: "+route+" "+url.result.value+" "+String(result.result.value).slice(0,300));
  }
  const evaluate=async expression=>{const result=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  await mkdir(join(root,'output','admin-ui'),{recursive:true});
  const widths=process.env.WORKCRUTE_ADMIN_WIDTHS ? process.env.WORKCRUTE_ADMIN_WIDTHS.split(',').map(Number) : [320,360,390,768,1024,1440,1920], routes=["/admin/tableau-de-bord/","/admin/postulants/","/admin/employes/","/admin/conges/","/admin/notifications/","/admin/parametres/","/admin/securite/"];
  for(const width of widths){
    await call("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<850});
    for(const route of routes){await navigate(route);for(const language of ["fr","en","ar"]){
      await evaluate(`workcruteAdminI18n.apply('${language}')`);await sleep(250);
      if([390,1440].includes(width)){const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(join(root,'output','admin-ui',`${route.split('/')[2]}-${width}-${language}.png`),Buffer.from(shot.data,'base64'));}
      if(route.includes('/postulants/')) {
        await sleep(300);
        const opened=await evaluate(`(()=>{const button=document.querySelector('[data-open-id]');if(!button)return false;button.click();return true;})()`);
        if(opened){for(let i=0;i<150&&!await evaluate("document.querySelector('[data-v2-dialog]').open");i++)await sleep(100);const modalShot=await call('Page.captureScreenshot',{format:'png'});await writeFile(join(root,'output','admin-ui',`modal-${width}-${language}.png`),Buffer.from(modalShot.data,'base64'));await evaluate(`(()=>{const dialog=document.querySelector('[data-v2-dialog]'),rect=dialog.getBoundingClientRect();if(!dialog.open||rect.left<0||rect.right>innerWidth||dialog.scrollWidth>rect.width+1||dialog.querySelectorAll('details').length!==5)throw new Error('Applicant modal layout '+JSON.stringify({open:dialog.open,left:rect.left,right:rect.right,viewport:innerWidth,width:rect.width,scroll:dialog.scrollWidth,details:dialog.querySelectorAll('details').length}));dialog.querySelector('[data-v2-close]').click();})()`);}
      }
      await evaluate(`(()=>{const header=document.querySelector('.adm-topbar');if([...header.querySelectorAll('[data-admin-logout],[data-admin-language]')].some(node=>getComputedStyle(node).display==='none')||header.querySelectorAll('[data-admin-logout]').length!==1||header.querySelector('.adm-search,.adm-user,[data-admin-menu]'))throw new Error('Header');const menu=document.querySelector('[data-admin-menu]');menu.click();menu.click();if(document.documentElement.scrollWidth>innerWidth+1)throw new Error('Overflow '+location.pathname+' '+innerWidth);})()`);
    }}
    process.stdout.write("Admin UI FR/EN/AR "+width+"px: PASS\\n");
  }
  if(errors.length)throw new Error(JSON.stringify(errors));
}finally{socket?.close();if(process.platform==="win32"){spawnSync("taskkill",["/pid",String(browser.pid),"/T","/F"],{stdio:"ignore"});spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore"});}else{browser.kill("SIGTERM");server.kill("SIGTERM");}await sleep(500);await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});}
