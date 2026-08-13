(() => {
  const call = async (path, options = {}) => {
    if (location.hostname.endsWith("github.io")) return window.workcruteLocalApi.request(path, options);
    let response;try{response=await fetch(path,{credentials:"same-origin",headers:{"content-type":"application/json",...(options.headers||{})},...options});}catch(error){throw(window.WorkcruteErrors?.networkError()||error);}
    if (response.status === 204) return null;
    const body = await response.json().catch(() => null);
    if (!response.ok) { const error=window.WorkcruteErrors?.apiError(response,body||{})||Object.assign(new Error(body?.userMessage||body?.error||"Une erreur est survenue."),{status:response.status,requestId:body?.requestId,code:body?.code});if(response.status===401)window.WorkcruteErrors?.sessionExpired();throw error; }
    return body;
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]));
  const toast = value => { const el = document.querySelector("#toast"); if (!el) return; el.textContent = value; el.classList.add("on"); setTimeout(() => el.classList.remove("on"), 3000); };
  const completion = profile => {
    const keys = ["city","region","professional_title","introduction","availability"];
    return Math.round(keys.filter(key => Boolean(profile?.[key])).length / keys.length * 100);
  };
  const documentsMarkup = documents => documents.length ? documents.map(doc => '<div class="row"><div><b>'+esc(doc.original_name)+'</b><div class="rowsub">'+(doc.kind === "cv" ? "CV" : "Lettre de motivation")+' · '+Math.round(doc.size_bytes / 1024)+' Ko</div></div><button class="btn secondary sm" data-delete-document="'+doc.id+'">Supprimer</button></div>').join("") : '<p class="muted">Aucun document ajouté.</p>';
  const profileMarkup = (data, documents, questions) => {
    const p = data.profile || {};
    const answers = JSON.parse(p.questionnaire_answers || "{}");
    const questionFields = questions.map(q => '<label class="field"><span>'+esc(q.labels?.fr || q.field_key)+(q.is_required ? " *" : "")+'</span>'+selectQuestion(q, answers[q.field_key])+'</label>').join("");
    return '<section class="page"><div class="pagetitle"><div><h1>Mon profil</h1><p>Modifiez vos informations, vos documents et vos préférences.</p></div></div><div class="card pad"><form id="live-profile"><div class="formgrid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><label class="field"><span>Ville</span><input name="city" value="'+esc(p.city)+'" placeholder="Casablanca"></label><label class="field"><span>Région</span><input name="region" value="'+esc(p.region)+'" placeholder="Casablanca-Settat"></label><label class="field"><span>Titre professionnel</span><input name="professionalTitle" value="'+esc(p.professional_title)+'" placeholder="Ex. Développeuse web"></label><label class="field"><span>Disponibilité</span><select name="availability"><option '+(p.availability === "Immédiate" ? "selected":"")+'>Immédiate</option><option '+(p.availability === "Sous 1 mois" ? "selected":"")+'>Sous 1 mois</option><option '+(p.availability === "Sous 3 mois" ? "selected":"")+'>Sous 3 mois</option></select></label><label class="field full" style="grid-column:1/-1"><span>Présentation</span><textarea name="introduction" maxlength="1000">'+esc(p.introduction)+'</textarea></label>'+questionFields+'</div><button class="btn primary">Enregistrer mes informations</button></form></div><div class="card" style="margin-top:18px"><div class="cardhead"><h2>Mes documents</h2></div><div class="pad">'+documentsMarkup(documents)+'<form id="live-document" style="margin-top:16px"><label class="field"><span>Type de document</span><select name="kind"><option value="cv">CV</option><option value="cover_letter">Lettre de motivation</option></select></label><label class="field"><span>Fichier PDF, DOC ou DOCX (8 Mo maximum)</span><input required type="file" name="file" accept=".pdf,.doc,.docx"></label><button class="btn secondary">Ajouter un document</button></form></div></div></section>';
  };
  const selectQuestion = (question, value) => {
    if (question.type === "select") return '<select name="question_'+esc(question.field_key)+'"><option value="">Sélectionnez</option>'+question.options.map(option => '<option '+(value === option ? "selected":"")+'>'+esc(option)+'</option>').join("")+'</select>';
    return '<input name="question_'+esc(question.field_key)+'" value="'+esc(value)+'">';
  };
  const dashboardMarkup = (data, documents, notifications) => {
    const p = data.profile || {}, percent = completion(p), missing = [];
    if (!p.city) missing.push("votre ville");
    if (!p.professional_title) missing.push("votre titre professionnel");
    if (!p.introduction) missing.push("votre présentation");
    if (!documents.some(d => d.kind === "cv")) missing.push("votre CV");
    const first = esc(p.first_name || data.user.email.split("@")[0]);
    return '<section class="page"><div class="pagetitle"><div><h1>Bonjour, '+first+'.</h1><p>Voici les informations utiles pour avancer aujourd’hui.</p></div><button class="btn primary" data-app="candidate-profile">Compléter mon profil</button></div><div class="metrics"><div class="metric"><span>Profil complété</span><b>'+percent+' %</b><em>Calculé depuis vos informations</em></div><div class="metric"><span>CV enregistrés</span><b>'+documents.filter(d => d.kind === "cv").length+'</b><em>Documents privés</em></div><div class="metric"><span>Notifications non lues</span><b>'+notifications.filter(n => !n.read_at).length+'</b><em>Données de votre compte</em></div></div><div class="grid"><section class="card"><div class="cardhead"><h2>Prochaine action</h2></div><div class="pad"><b>'+ (missing.length ? "Complétez "+missing[0] : "Votre profil est prêt à être consulté.")+'</b><p class="muted">'+(missing.length ? "Les informations manquantes améliorent la pertinence des offres proposées." : "Vous pouvez explorer les offres correspondant à votre profil.")+'</p><button class="btn primary" data-app="'+(missing.length ? "candidate-profile":"candidate-jobs")+'">'+(missing.length ? "Compléter mon profil":"Explorer les offres")+'</button></div></section><aside class="card"><div class="cardhead"><h2>Dernières notifications</h2></div><div class="pad">'+(notifications.length ? notifications.slice(0,3).map(n => '<div class="row"><div><b>'+esc(n.title)+'</b><div class="rowsub">'+esc(n.body)+'</div></div><span class="status '+(!n.read_at ? "blue":"green")+'">'+(!n.read_at ? "Nouveau":"Lu")+'</span></div>').join("") : '<p class="muted">Aucune notification pour le moment.</p>')+'</div></aside></div></section>';
  };
  async function loadData() {
    const [account, documents, notifications, questions] = await Promise.all([call("/api/auth/me"), call("/api/documents"), call("/api/notifications"), call("/api/questionnaire")]);
    return { account, documents, notifications, questions };
  }
  async function hydrate(page) {
    const { account, documents, notifications, questions } = await loadData();
    if (account.user.role !== "candidate") return;
    if (page === "candidate-dashboard") document.querySelector("#pages").innerHTML = dashboardMarkup(account, documents, notifications);
    if (page === "candidate-profile") document.querySelector("#pages").innerHTML = profileMarkup(account, documents, questions);
    if (page === "candidate-notifications") document.querySelector("#pages").innerHTML = '<section class="page"><div class="pagetitle"><div><h1>Notifications</h1><p>Les nouvelles importantes de votre compte.</p></div><button class="btn secondary" id="mark-all">Tout marquer comme lu</button></div><div class="card pad">'+(notifications.length ? notifications.map(n => '<div class="row"><div><b>'+esc(n.title)+'</b><div class="rowsub">'+esc(n.body)+'</div></div><span class="status '+(!n.read_at ? "blue":"green")+'">'+(!n.read_at ? "Nouveau":"Lu")+'</span></div>').join("") : '<p class="muted">Aucune notification pour le moment.</p>')+'</div></section>';
    bind(account, questions);
  }
  function bind(account, questions) {
    document.querySelector("#live-profile")?.addEventListener("submit", async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const answers = {};
      questions.forEach(q => answers[q.field_key] = values["question_"+q.field_key] || "");
      try { await call("/api/profile", { method:"PATCH", body:JSON.stringify({ ...values, questionnaireAnswers:answers }) }); toast("Profil enregistré."); } catch (error) { toast(error.message); }
    });
    document.querySelector("#live-document")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const response = location.hostname.endsWith("github.io") ? { ok:true, json:async()=>({}) } : await fetch("/api/documents", { method:"POST", credentials:"same-origin", body:form });
      if (location.hostname.endsWith("github.io")) await window.workcruteLocalApi.uploadDocument(form);
      if (!response.ok) { const body=await response.json().catch(()=>({})),error=window.WorkcruteErrors?.apiError(response,body)||Object.assign(new Error(body.userMessage||"Impossible d’ajouter ce document."),body);return toast(window.WorkcruteErrors?.uploadMessage(error)||error.message); }
      toast("Document ajouté."); hydrate("candidate-profile");
    });
    document.querySelectorAll("[data-delete-document]").forEach(button => button.addEventListener("click", async () => {
      if (!confirm("Supprimer ce document ?")) return;
      await fetch("/api/documents/"+button.dataset.deleteDocument, { method:"DELETE", credentials:"same-origin" });
      toast("Document supprimé."); hydrate("candidate-profile");
    }));
    document.querySelector("#mark-all")?.addEventListener("click", async () => { await call("/api/notifications", { method:"POST" }); toast("Notifications mises à jour."); hydrate("candidate-notifications"); });
  }
  const original = window.workcruteApp;
  if (!original) return;
  window.workcruteApp = async page => { original(page); try { await hydrate(page); } catch (_) {} };
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-app]");
    if (!button?.dataset.app?.startsWith("candidate-")) return;
    setTimeout(() => window.workcruteApp(button.dataset.app), 0);
  }, true);
})();
