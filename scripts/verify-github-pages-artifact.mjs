import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = resolve(process.argv[2] || "public");
const commit = String(process.argv[3] || "local").trim();
const activePages = ["index.html", "connexion/index.html", "postuler/index.html"];
const retiredPages = ["offres/index.html", "candidats/index.html", "recruteurs/index.html", "inscription/index.html"];
const obsoleteBundles = ["client.js", "local-api.js", "candidate-workspace-v2.js", "recruiter-workspace-v2.js", "recruiter-signup.js"];
const forbidden = /Trouver un emploi|Je recrute|Dernières offres publiées|Créer mon profil|Publiez une offre|Matching transparent/;
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(path));
    else if (entry.name.endsWith(".html")) output.push(path);
  }
  return output;
}

await access(root);
const active = await Promise.all(activePages.map((file) => readFile(join(root, file), "utf8")));
if (!active[0].includes('data-i18n="v2_hero_title"') || !active[0].includes("Votre avenir commence ici")) {
  throw new Error("public/index.html n'est pas l'accueil Workcrute V2.");
}
if (active.some((html) => forbidden.test(html))) throw new Error("Une page V2 active contient encore du contenu V1.");
const retired = await Promise.all(retiredPages.map((file) => readFile(join(root, file), "utf8")));
if (retired.some((html) => !html.includes('name="workcrute-redirect"') || forbidden.test(html))) {
  throw new Error("Une ancienne route ne contient pas la redirection V2 attendue.");
}
for (const file of obsoleteBundles) {
  try {
    await access(join(root, file));
    throw new Error(`Bundle V1 encore publié : ${file}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
for (const htmlFile of await files(root)) {
  const html = await readFile(htmlFile, "utf8");
  for (const match of html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))/g)) {
    const asset = match[1].startsWith("/") ? join(root, match[1].slice(1)) : resolve(dirname(htmlFile), match[1]);
    try { await access(asset); } catch { throw new Error(`Asset absent dans ${htmlFile} : ${match[1]}`); }
  }
}
await writeFile(join(root, "version.json"), `${JSON.stringify({ product: "Workcrute V2", commit, generatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
process.stdout.write(`Artefact GitHub Pages V2 validé pour ${commit}.\n`);
