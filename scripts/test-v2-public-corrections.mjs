import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const home = await read("public/index.html");
const shell = await read("public/public-app.js");
const application = await read("public/postuler/index.html");
const flow = await read("public/v2-application.js");
for (const id of ["home", "metiers", "about", "facility"]) assert.ok(home.includes(`id="${id}"`), id);
assert.ok(!shell.includes('href("/aide")'));
assert.ok(!shell.includes('href("/faq")'));
assert.ok(shell.includes('sectionHref("cv-entry")'));
assert.ok(shell.includes('data-back-to-top'));
assert.ok(shell.includes('href("/connexion/")'));
assert.ok(shell.includes('const sectionHref ='));
assert.ok(shell.includes('event.target.closest("a[href]")'));
assert.equal((application.match(/data-cancel/g) || []).length, 1);
assert.ok(application.indexOf("data-back") < application.indexOf("data-cancel"));
assert.ok(application.indexOf("data-cancel") < application.indexOf("data-next"));
assert.ok(flow.includes("current !== steps.length - 1"));
assert.ok(flow.includes("window.confirm"));
assert.ok(flow.includes("if (!result.ok || !result.reference)"));
const context = { window: {}, URLSearchParams, location:{search:"",pathname:"/",hash:""}, navigator: { languages: ["fr"] }, localStorage: { getItem: () => "fr" }, document: { documentElement:{style:{}},readyState: "loading", addEventListener() {} } };
vm.runInNewContext(await read("public/public-i18n.js"), context);
for (const language of ["fr", "en", "ar"]) {
  const keys = [...(home + application).matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
  for (const key of keys) assert.ok(context.window.workcrutePublicI18n.messages[language][key], `${language}: ${key}`);
  assert.ok(context.window.workcrutePublicI18n.messages[language].apply_cancel_confirm);
}
console.log("Public anchors, commands, submission guards and FR/EN/AR catalogues: PASS");
const backend = await read("src/index.js");
assert.ok(backend.includes('pathname === "/api/v2/applicants"') && backend.includes('pathname === "/api/v2/questions" && request.method === "GET"') && backend.includes('request.headers.get("origin") === "https://bayaya-devi.github.io"'));
assert.ok(flow.includes('window.workcrute.apiUrl("/api/v2/applicants")'));
console.log("GitHub anonymous submission CORS scope: PASS");
