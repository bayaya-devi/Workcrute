import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFile(`${root}/${path}`, "utf8");
const check = (condition, label) => {
  if (!condition) throw new Error(`Échec: ${label}`);
  process.stdout.write(`✓ ${label}\n`);
};

const [publicI18n, adminI18n, employee, employeeAdmin, leaveAdmin, identityAdmin] =
  await Promise.all([
    read("public/public-i18n.js"),
    read("public/admin-i18n.js"),
    read("public/employee-app.js"),
    read("public/admin-v2-employees.js"),
    read("public/admin-v2-leave.js"),
    read("public/admin-v2-identity.js"),
  ]);

check(publicI18n.includes("navigator.languages"), "détection de la langue du navigateur");
check((publicI18n.match(/\b(?:fr|en|ar):\s*\{/g) || []).length >= 3, "catalogue public FR/EN/AR");
check((adminI18n.match(/\b(?:fr|en|ar):\s*\{/g) || []).length >= 3, "catalogue admin FR/EN/AR");
check((employee.match(/\b(?:fr|en|ar):\s*\{/g) || []).length >= 3, "catalogue employé FR/EN/AR");
for (const [name, source] of [["employés admin", employeeAdmin], ["congés admin", leaveAdmin], ["identité admin", identityAdmin]]) {
  check((source.match(/\b(?:fr|en|ar):\s*\{/g) || []).length >= 3, `contenus dynamiques ${name} en trois langues`);
  check(source.includes('admin:language'), `mise à jour immédiate ${name}`);
}
check(employee.includes('document.documentElement.dir=language==="ar"?"rtl":"ltr"'), "RTL de l’espace employé");
check(adminI18n.includes('document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"'), "RTL du Control Center");
process.stdout.write("V2 i18n static validation: OK\n");
