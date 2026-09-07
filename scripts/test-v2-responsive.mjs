import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url)),wrangler=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url)),chrome="C:/Program Files/Google/Chrome/Application/chrome.exe",base="http://127.0.0.1:8802",profile=await mkdtemp(join(tmpdir(),"workcrute-chrome-"));
const server=spawn(process.execPath,[wrangler,"dev","--local","--port","8802","--var","ENVIRONMENT:test"],{cwd:root,stdio:"ignore"}),browser=spawn(chrome,["--headless=new","--disable-gpu","--no-first-run",`--user-data-dir=${profile}`,"--remote-debugging-port=9223","about:blank"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function json(url){for(let index=0;index<100;index+=1){try{return await (await fetch(url)).json();}catch{}await sleep(100);}throw new Error(`Indisponible: ${url}`);}
let socket,nextId=0;const pending=new Map();
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
try{
  for(let index=0;index<150;index+=1){try{if((await fetch(`${base}/`)).ok)break;}catch{}await sleep(100);}
  const pages=await json("http://127.0.0.1:9223/json/list");socket=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const value=JSON.parse(event.data);if(!value.id)return;const item=pending.get(value.id);pending.delete(value.id);value.error?item.reject(new Error(value.error.message)):item.resolve(value.result);});
  await call("Page.enable");await call("Runtime.enable");
  const widths=[320,375,390,430,768,1024,1440,1920],routes=["/","/connexion/","/postuler/","/aide/"];
  for(const width of widths){await call("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<768});for(const route of routes){await call("Page.navigate",{url:base+route});await sleep(450);const result=await call("Runtime.evaluate",{returnByValue:true,expression:"(()=>{const viewport=innerWidth,offenders=[...document.querySelectorAll('body *')].filter(node=>{const style=getComputedStyle(node),rect=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>1&&!node.closest('.wc-apply-progress')&&(rect.left < -1||rect.right > viewport+1);}).slice(0,8).map(node=>({tag:node.tagName,className:String(node.className),left:Math.round(node.getBoundingClientRect().left),right:Math.round(node.getBoundingClientRect().right)}));return{viewport,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,offenders};})()"}),value=result.result.value;if(value.documentWidth>value.viewport+1||value.bodyWidth>value.viewport+1||value.offenders.length)throw new Error(`Débordement ${route} à ${width}px: ${JSON.stringify(value)}`);}process.stdout.write(`✓ ${width}px sans débordement sur 4 routes publiques\n`);}
  process.stdout.write("V2 responsive browser validation: OK\n");
}finally{socket?.close();if(process.platform==="win32"){spawnSync("taskkill",["/pid",String(browser.pid),"/T","/F"],{stdio:"ignore"});spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore"});}else{browser.kill("SIGTERM");server.kill("SIGTERM");}await rm(profile,{recursive:true,force:true});}
