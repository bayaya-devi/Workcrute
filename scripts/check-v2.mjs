import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url));
async function javascriptFiles(directory){const entries=await readdir(`${root}/${directory}`,{withFileTypes:true}),files=[];for(const entry of entries){const relative=`${directory}/${entry.name}`;if(entry.isDirectory())files.push(...await javascriptFiles(relative));else if(entry.name.endsWith(".js")||entry.name.endsWith(".mjs"))files.push(relative);}return files;}
const files=[...await javascriptFiles("src"),...await javascriptFiles("public"),...await javascriptFiles("scripts")];
for(const file of files){const result=spawnSync(process.execPath,["--check",file],{cwd:root,encoding:"utf8"});if(result.status!==0)throw new Error(`${file}\n${result.stderr}`);}
const index=await readFile(`${root}/src/index.js`,"utf8");
for(const module of ["v2-applicants","v2-admin-applicants","v2-auth","v2-admin-employees","v2-employee","v2-leave","v2-faq"]){if(!index.includes(`./${module}.js`))throw new Error(`Module V2 non branché: ${module}`);}
const wrangler=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url));
const build=spawnSync(process.execPath,[wrangler,"deploy","--dry-run"],{cwd:root,encoding:"utf8"});
if(build.status!==0)throw new Error(build.stderr||build.stdout);
process.stdout.write(`✓ ${files.length} fichiers JavaScript valides\n✓ modules V2 branchés\n✓ build Worker valide\nWorkcrute V2 check: OK\n`);
