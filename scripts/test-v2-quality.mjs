import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url)),read=path=>readFile(`${root}/${path}`,"utf8"),check=(ok,label)=>{if(!ok)throw new Error(`Échec: ${label}`);process.stdout.write(`✓ ${label}\n`);};
const pages=["public/index.html","public/connexion/index.html","public/postuler/index.html","public/aide/index.html","public/a-propos/index.html","public/mentions-legales/index.html","public/confidentialite/index.html","public/conditions/index.html","public/403/index.html","public/404/index.html","public/404.html","public/500/index.html"],documents=await Promise.all(pages.map(read));
for(let index=0;index<pages.length;index+=1){const html=documents[index];check(html.includes('name="viewport"')&&html.includes("<main"),`${pages[index]} structurée pour le viewport`);check(!html.includes("client.js")&&!html.includes("local-api.js"),`${pages[index]} sans bundle historique`);}
const css=await read("public/public-system.css"),headers=await read("public/_headers"),i18n=await read("public/public-i18n.js");
check(css.includes(":focus-visible")&&css.includes("prefers-reduced-motion"),"focus clavier et réduction des animations");
check(headers.includes("/*.css")&&headers.includes("/*.js"),"cache explicite des ressources statiques");
check(i18n.includes("v2_benefits_label"),"libellé accessible traduit en FR/EN/AR");
const [dashboard,dashboardScript]=await Promise.all([read("public/admin/tableau-de-bord/index.html"),read("public/admin-v2-dashboard.js")]);
check(dashboard.includes("admin-v2-dashboard.js")&&!dashboard.includes("admin-dashboard.js"),"tableau de bord administrateur aligné sur V2");
check(["/api/admin/v2/applicants","/api/admin/v2/employees","/api/admin/v2/leave"].every(path=>dashboardScript.includes(path)),"indicateurs administrateur issus des API V2 réelles");
const scripts=[...documents[0].matchAll(/<script src="\.\/([^\"]+)"/g)].map(match=>`public/${match[1]}`),bytes=(await Promise.all(scripts.map(path=>stat(`${root}/${path}`)))).reduce((sum,item)=>sum+item.size,0);
check(bytes<120*1024,`JavaScript initial de l’accueil limité à ${Math.round(bytes/1024)} Ko non compressés`);
process.stdout.write("V2 performance and accessibility static validation: OK\n");
