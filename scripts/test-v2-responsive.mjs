import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { executeLocalSql } from "./local-d1.mjs";

const root=fileURLToPath(new URL("..",import.meta.url)),wrangler=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url)),chrome="C:/Program Files/Google/Chrome/Application/chrome.exe",serverPort=12000+Math.floor(Math.random()*2000),chromePort=serverPort+3000,base=`http://127.0.0.1:${serverPort}`,profile=await mkdtemp(join(tmpdir(),"workcrute-chrome-"));
const server=spawn(process.execPath,[wrangler,"dev","--local","--port",String(serverPort),"--var","ENVIRONMENT:test"],{cwd:root,stdio:"ignore"}),browser=spawn(chrome,["--headless=new","--disable-gpu","--no-first-run","--disable-extensions","--no-proxy-server",`--user-data-dir=${profile}`,`--remote-debugging-port=${chromePort}`,"about:blank"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timedFetch=(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(1500)});
async function json(url){for(let index=0;index<30;index+=1){try{return await (await timedFetch(url)).json();}catch{}await sleep(150);}throw new Error(`Indisponible: ${url}`);}
let socket,nextId=0;const errors=[];const pending=new Map();
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP sans réponse: ${method}`));},5000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
try{
  let ready=false;for(let index=0;index<60;index+=1){try{if((await timedFetch(`${base}/`)).ok){ready=true;break;}}catch{}await sleep(150);}if(!ready)throw new Error("Serveur local indisponible.");
  const pages=await json(`http://127.0.0.1:${chromePort}/json/list`);socket=new WebSocket(pages.find(page=>page.type==="page"&&!page.url.startsWith("chrome-extension://")).webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const value=JSON.parse(event.data);if(value.method==="Runtime.exceptionThrown")errors.push(value.params.exceptionDetails);if(!value.id)return;const item=pending.get(value.id);pending.delete(value.id);value.error?item.reject(new Error(value.error.message)):item.resolve(value.result);});
  await call("Page.enable");await call("Runtime.enable");
  async function navigate(route) {
    await call("Page.navigate", { url: base + route });
    for (let attempt=0; attempt<80; attempt++) {
      const result=await call("Runtime.evaluate", {expression:`location.pathname === "${route}" && document.readyState === "complete" && !!window.workcrutePublicI18n`,returnByValue:true});
      if (result.result?.value) return;
      await sleep(100);
    }
    const result=await call("Runtime.evaluate",{expression:"document.documentElement.outerHTML",returnByValue:true});
    const url=await call("Runtime.evaluate",{expression:"location.href",returnByValue:true});
    throw new Error("Page not ready: "+route+" "+url.result.value+" "+String(result.result.value).slice(0,300));
  }
  const widths=[320,375,390,430,768,1024,1440,1920],routes=["/","/connexion/","/postuler/"];
  for(const width of widths){await call("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<768});for(const route of routes){await navigate(route);for(const language of ["fr","en","ar"]){await call("Runtime.evaluate",{expression:`window.workcrutePublicI18n.apply("${language}")`});const result=await call("Runtime.evaluate",{returnByValue:true,expression:"(()=>{const viewport=innerWidth,buttons=[...document.querySelectorAll('.wc-header-actions a.wc-button')];if(buttons.length!==2||buttons.some(button=>getComputedStyle(button).display==='none'))throw new Error('Missing public action');const offenders=[...document.querySelectorAll('body *')].filter(node=>{const style=getComputedStyle(node),rect=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>1&&!node.closest('.wc-apply-progress')&&(rect.left < -1||rect.right > viewport+1);}).slice(0,8).map(node=>({tag:node.tagName,className:String(node.className),left:Math.round(node.getBoundingClientRect().left),right:Math.round(node.getBoundingClientRect().right)}));return{viewport,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,offenders};})()"}),value=result.result.value;if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));if(value.documentWidth>value.viewport+1||value.bodyWidth>value.viewport+1||value.offenders.length)throw new Error(`Débordement ${route} à ${width}px: ${JSON.stringify(value)}`);}}process.stdout.write(`✓ ${width}px sans débordement sur 3 routes publiques FR/EN/AR\n`);}

  const evaluate = async expression => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  executeLocalSql("DELETE FROM v2_submission_attempts");
  for (const language of ["fr", "en", "ar"]) {
    await navigate("/postuler/");
    await evaluate(`window.workcrutePublicI18n.apply("${language}")`);
    await evaluate(`(() => {
      const form = document.querySelector("[data-v2-application]");
      const check = (ok, label) => { if (!ok) throw new Error(label); };
      const next = form.querySelector("[data-next]");
      check(form.querySelector("[data-submit]").hidden, "Premature submission");
      next.click();
      check(!form.querySelector('[data-step="0"]').hidden, "Empty step accepted");
      const values = { firstName:"Browser", lastName:"Validation", email:"browser@example.com", phone:"+212612345678", city:"Rabat", country:"Maroc" };
      Object.entries(values).forEach(([name,value]) => form.elements[name].value=value);
      form.elements.email.value="invalid";
      next.click();
      check(!form.querySelector('[data-step="0"]').hidden, "Invalid email accepted");
      form.elements.email.value=values.email;
      next.click();
      check(!form.querySelector('[data-step="1"]').hidden, "Identity step failed");
      form.querySelector("[data-back]").click();
      check(form.elements.firstName.value==="Browser", "Lost identity");
      next.click();
      Object.entries({professionalTitle:"Technicien",domain:"industry",experienceLevel:"junior",availability:"immediate"}).forEach(([name,value])=>form.elements[name].value=value);
      next.click();
      check(!form.querySelector('[data-step="2"]').hidden, "Profile step failed");
      const files=new DataTransfer();
      files.items.add(new File(["%PDF-1.4\\nBrowser validation"], "browser-validation.pdf",{type:"application/pdf"}));
      form.elements.cvInput.files=files.files;
      form.elements.cvInput.dispatchEvent(new Event("change"));
      next.click();
      check(!form.querySelector('[data-step="3"]').hidden, "Review step failed");
      check(!form.querySelector("[data-submit]").hidden, "Final submit missing");
      form.elements.consent.checked=true;
      form.querySelector("[data-submit]").click();
      check(form.querySelector("[data-submit]").disabled, "Missing submit lock");
      return true;
    })()`);
    let success=false;
    for(let attempt=0;attempt<40;attempt++){
      success = await evaluate(`!document.querySelector("[data-application-success]").hidden && /^WC-/.test(document.querySelector("[data-reference]").textContent)`);
      if(success) break;
      await sleep(200);
    }
    if (!success) throw new Error("Browser submission failed: " + language + " " + await evaluate('document.querySelector("[data-form-error]").textContent'));
    process.stdout.write(`✓ Real browser application with CV, validation, back and submission: ${language}\\n`);
  }
  if(errors.length) throw new Error("Browser console exceptions: "+JSON.stringify(errors));
  process.stdout.write("V2 responsive browser validation and console: OK\n");
}finally{socket?.close();if(process.platform==="win32"){spawnSync("taskkill",["/pid",String(browser.pid),"/T","/F"],{stdio:"ignore"});spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore"});}else{browser.kill("SIGTERM");server.kill("SIGTERM");}await sleep(500);await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});}
