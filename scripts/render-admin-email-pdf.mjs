import { writeFile, mkdir } from "node:fs/promises";
import { createSummaryPdf } from "../src/admin-email.js";

const output = new URL("../tmp/pdfs/workcrute-admin-email-sample.pdf", import.meta.url);
await mkdir(new URL("../tmp/pdfs/", import.meta.url), { recursive: true });
await writeFile(output, createSummaryPdf({
  kind: "candidate",
  fields: [
    ["Date", "13 août 2026, 15:30"],
    ["ID utilisateur", "a6b8dd56-7b91-4d33-a77c-1b65c8670920"],
    ["Nom", "Benali"],
    ["Prénom", "Sara"],
    ["Email", "sara.benali@example.com"],
    ["Téléphone", "+212612345678"],
    ["Ville", "Casablanca"],
    ["Région", "Casablanca-Settat"],
    ["Métier", "Développeuse web"],
    ["Secteur", "Informatique"],
    ["Expérience", "3 ans"],
    ["Disponibilité", "Immédiatement"],
    ["Contrat", "CDI"],
    ["Télétravail", "Hybride"],
    ["Compétences", "JavaScript, React, Node.js"],
    ["Documents ajoutés", "CV : CV-Sara-Benali.pdf"],
  ],
}));
console.log(output.pathname.slice(1));
