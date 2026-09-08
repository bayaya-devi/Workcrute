import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url)),read=path=>readFile(`${root}/${path}`,"utf8"),check=(ok,label)=>{if(!ok)throw new Error(`Échec: ${label}`);process.stdout.write(`✓ ${label}\n`);};
const [applicants,auth,headers,identity]=await Promise.all([read("src/v2-applicants.js"),read("src/v2-auth.js"),read("public/_headers"),read("public/admin/identite-v2/index.html")]);
check(applicants.includes("PAYLOAD_TOO_LARGE")&&applicants.includes("UNSUPPORTED_MEDIA_TYPE"),"taille et type du multipart contrôlés avant parsing");
check(applicants.includes("signatures")&&applicants.includes('return "content"'),"signature binaire des documents contrôlée");
check(auth.includes("PBKDF2")&&auth.includes("iterations: 100000"),"mots de passe dérivés par PBKDF2");
check(auth.includes("HttpOnly; Secure; SameSite=Lax"),"cookie de session protégé");
check(auth.includes("password.length < 12")&&identity.includes('minlength="12"'),"mot de passe administrateur de 12 caractères minimum");
check(headers.includes("Content-Security-Policy")&&headers.includes("object-src 'none'")&&headers.includes("frame-ancestors 'none'"),"CSP restrictive sur les pages Cloudflare");
const source=(await Promise.all(["src/v2-admin-applicants.js","src/v2-admin-employees.js","src/v2-employee.js","src/v2-leave.js"].map(read))).join("\n");
check(!/(?:api[_-]?key|secret|password)\s*=\s*["'][^"']{8,}["']/i.test(source),"aucun secret codé en dur dans les modules V2");
process.stdout.write("V2 security static validation: OK\n");
