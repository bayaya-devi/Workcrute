import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const legacyPages = [
  "offres/index.html", "offres/detail/index.html", "candidats/index.html", "recruteurs/index.html",
  "inscription/index.html", "inscription/demandeur/index.html", "inscription/recruteur/index.html",
  "mot-de-passe-oublie/index.html",
  "demandeur/tableau-de-bord/index.html", "demandeur/notifications/index.html", "demandeur/parametres/index.html",
  "demandeur/entretiens/index.html", "demandeur/offres-enregistrees/index.html", "demandeur/documents/index.html",
  "demandeur/offres/index.html", "demandeur/offres/detail/index.html", "demandeur/candidatures/index.html",
  "demandeur/candidatures/detail/index.html", "demandeur/alertes/index.html", "demandeur/profil/index.html",
  "demandeur/profil/modifier/index.html", "demandeur/securite/index.html",
  "recruteur/tableau-de-bord/index.html", "recruteur/notifications/index.html", "recruteur/parametres/index.html",
  "recruteur/entretiens/index.html", "recruteur/securite/index.html", "recruteur/profil/index.html",
  "recruteur/entreprise/index.html", "recruteur/offres/index.html", "recruteur/offres/detail/index.html",
  "recruteur/offres/nouvelle/index.html", "recruteur/offres/modifier/index.html",
  "recruteur/candidatures/index.html", "recruteur/candidatures/detail/index.html",
  "recruteur/candidats/index.html", "recruteur/candidats/profil/index.html",
  "recruteur/questionnaires/index.html", "recruteur/questionnaires/detail/index.html",
];

for (const page of legacyPages) {
  const file = resolve(root, page);
  const home = relative(dirname(file), root).split(sep).join("/") || ".";
  const target = page === "mot-de-passe-oublie/index.html" ? `${home}/connexion/` : `${home}/`;
  const script = `${home}/retired-route.js`;
  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <meta name="workcrute-redirect" content="${target}">
    <meta http-equiv="refresh" content="0;url=${target}">
    <link rel="canonical" href="https://workcrute.pages.dev/">
    <title>Redirection vers Workcrute V2</title>
  </head>
  <body>
    <main><p>Cette adresse a été remplacée par Workcrute V2.</p><a href="${target}">Continuer vers Workcrute</a></main>
    <script src="${script}"></script>
  </body>
</html>
`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
}

process.stdout.write(`${legacyPages.length} anciennes pages remplacées par des redirections V2.\n`);
