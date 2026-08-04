(() => {
  const root = location.pathname.startsWith("/Workcrute/") ? "/Workcrute" : "";
  const go = path => { location.href = root + path; };
  const api = async (path, options = {}) => {
    if (location.hostname.endsWith("github.io")) return window.workcruteLocalApi.request(path, options);
    const response = await fetch(path, { credentials:"same-origin", headers:{"content-type":"application/json", ...(options.headers || {})}, ...options });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || "Une erreur est survenue.");
    return body;
  };
  const routeFor = role => role === "recruiter" ? "/recruteur/tableau-de-bord" : role === "admin" ? "/admin/tableau-de-bord" : "/demandeur/tableau-de-bord";
  const errorText = error => {
    const message = String(error?.message || "");
    if (/identifiants|mot de passe|email/i.test(message)) return "L'adresse e-mail ou le mot de passe est incorrect.";
    if (/connectez-vous|authentification/i.test(message)) return "Votre session a expiré. Connectez-vous à nouveau.";
    if (/réseau|network|fetch/i.test(message)) return "Le serveur est inaccessible. Vérifiez votre connexion puis réessayez.";
    return message || "Nous n'avons pas pu terminer cette action. Réessayez dans quelques instants.";
  };
  const setBusy = (button, busy, label) => { if (!button) return; button.disabled = busy; if (label) button.textContent = label; };
  document.querySelectorAll("[data-go]").forEach(link => link.addEventListener("click", event => { event.preventDefault(); go(link.dataset.go); }));
  document.querySelectorAll("[data-language]").forEach(select => {
    select.value = localStorage.getItem("wc_language") || "fr";
    select.addEventListener("change", () => { localStorage.setItem("wc_language", select.value); document.documentElement.lang = select.value; });
  });
  const login = document.querySelector("[data-login-form]");
  if (login) login.addEventListener("submit", async event => {
    event.preventDefault(); const error = login.querySelector(".error"), button = login.querySelector("[type=submit]");
    error.textContent = ""; setBusy(button, true, "Connexion...");
    try { const result = await api("/api/auth/login", {method:"POST", body:JSON.stringify(Object.fromEntries(new FormData(login)))}); go(routeFor(result.user.role)); }
    catch (err) { error.textContent = errorText(err); } finally { setBusy(button, false, "Me connecter"); }
  });
  const forgot = document.querySelector("[data-forgot-password-form]");
  if (forgot) forgot.addEventListener("submit", async event => {
    event.preventDefault(); const note = forgot.querySelector(".form-note"), button = forgot.querySelector("[type=submit]");
    setBusy(button, true, "Envoi...");
    try { await api("/api/auth/forgot-password", {method:"POST", body:JSON.stringify(Object.fromEntries(new FormData(forgot)))}); note.textContent = "Si cette adresse correspond à un compte, un e-mail de réinitialisation sera envoyé."; }
    catch (err) { note.textContent = errorText(err); } finally { setBusy(button, false, "Envoyer le lien"); }
  });
  const signup = document.querySelector("[data-signup]");
  if (signup) {
    let index = 0; const steps = [...signup.querySelectorAll(".step")], progress = signup.querySelector(".progress i");
    const update = () => { steps.forEach((step, i) => step.classList.toggle("active", i === index)); if (progress) progress.style.width = ((index + 1) / steps.length * 100) + "%"; signup.querySelector("[data-step-label]").textContent = "Étape " + (index + 1) + " sur " + steps.length; signup.querySelector("[data-back]").hidden = index === 0; signup.querySelector("[data-next]").hidden = index === steps.length - 1; signup.querySelector("[type=submit]").hidden = index !== steps.length - 1; };
    signup.querySelector("[data-next]")?.addEventListener("click", () => { const fields = [...steps[index].querySelectorAll("[required]")]; if (fields.every(field => field.reportValidity())) { index += 1; update(); } });
    signup.querySelector("[data-back]")?.addEventListener("click", () => { if (index) { index -= 1; update(); } });
    signup.addEventListener("submit", async event => {
      event.preventDefault(); const error = signup.querySelector(".error"), button = signup.querySelector("[type=submit]"), data = Object.fromEntries(new FormData(signup));
      error.textContent = ""; if (data.password !== data.confirmPassword) { error.textContent = "Les mots de passe ne correspondent pas."; return; }
      setBusy(button, true, "Création...");
      try {
        const result = await api("/api/auth/register", {method:"POST", body:JSON.stringify({...data, role:signup.dataset.role, acceptedTerms:true})});
        if (signup.dataset.role === "candidate") await api("/api/profile", {method:"PATCH", body:JSON.stringify({city:data.city, region:data.region, availability:data.availability, introduction:data.introduction, questionnaireAnswers:{domain:data.domain === "other" ? data.otherDomain : data.domain, contract:data.contract, experience:data.experience, workMode:data.workMode, skills:data.skills}})});
        const files = new FormData(signup);
        for (const [field, kind] of [["cv","cv"],["letter","cover_letter"]]) {
          const file = files.get(field); if (!file?.size) continue;
          const form = new FormData(); form.set("kind", kind); form.set("file", file);
          if (location.hostname.endsWith("github.io")) await window.workcruteLocalApi.uploadDocument(form); else { const upload = await fetch("/api/documents", {method:"POST", credentials:"same-origin", body:form}); if (!upload.ok) throw new Error("Le document n'a pas pu être ajouté."); }
        }
        go(routeFor(result.user.role));
      } catch (err) { error.textContent = errorText(err); } finally { setBusy(button, false, "Terminer"); }
    }); update();
  }
  const role = document.body.dataset.protected;
  if (role) api("/api/auth/me").then(({user}) => { if (user.role !== role) go("/connexion"); const target = document.querySelector("[data-user-email]"); if (target) target.textContent = user.email; }).catch(() => go("/connexion"));
  document.querySelectorAll("[data-logout]").forEach(button => button.addEventListener("click", async () => { try { await api("/api/auth/logout", {method:"POST"}); } finally { go("/"); } }));
  const job = document.querySelector("[data-job-form]");
  if (job) job.addEventListener("submit", async event => { event.preventDefault(); const error = job.querySelector(".error"), button = job.querySelector("[type=submit]"); error.textContent = ""; setBusy(button,true,"Publication..."); try { await api("/api/jobs",{method:"POST",body:JSON.stringify({...Object.fromEntries(new FormData(job)),status:"published"})}); go("/recruteur/offres"); } catch(err) { error.textContent=errorText(err); } finally { setBusy(button,false,"Publier l'offre"); } });
  const questions = document.querySelector("[data-question-list]");
  if (questions) api("/api/admin/questionnaire").then(({items}) => { questions.innerHTML = items.length ? items.map(q => '<div class="item"><strong>'+q.labels.fr+'</strong><p>'+q.type+' · '+(q.is_required ? "Obligatoire" : "Facultative")+'</p></div>').join("") : '<div class="empty-state">Aucune question pour le moment.</div>'; }).catch(() => { questions.innerHTML = '<div class="error-banner">Impossible de charger les questions.</div>'; });
  const questionForm = document.querySelector("[data-question-form]");
  if (questionForm) questionForm.addEventListener("submit", async event => { event.preventDefault(); const error=questionForm.querySelector(".error"), data=Object.fromEntries(new FormData(questionForm)); data.required=Boolean(questionForm.required.checked); data.options=data.options?data.options.split(",").map(x=>x.trim()).filter(Boolean):[]; try { await api("/api/admin/questionnaire",{method:"POST",body:JSON.stringify(data)}); location.reload(); } catch(err) { error.textContent=errorText(err); } });
  window.workcrute = {api, go};
})();