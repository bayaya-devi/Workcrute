import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const directory=fileURLToPath(new URL("../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/",import.meta.url));
const databaseFile=readdirSync(directory).find(name=>name.endsWith(".sqlite")&&name!=="metadata.sqlite");
if(!databaseFile)throw new Error("Base D1 locale introuvable. Exécutez d’abord les migrations locales.");

export function executeLocalSql(sql){let lastError;for(let attempt=0;attempt<20;attempt+=1){let database;try{database=new DatabaseSync(join(directory,databaseFile));database.exec("PRAGMA foreign_keys=ON;"+sql);return;}catch(error){lastError=error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}finally{database?.close();}}throw lastError;}
