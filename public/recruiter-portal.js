(() => {
  const api = window.workcrute?.api;
  if (!api || !document.body.matches('[data-protected="recruiter"]')) return;
  const view = document.body.dataset.recruiterView;
  const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const empty = text => '<div class="empty-state"><p>'+safe(text)+'</p></div>';
  const stat = (label,value) => '<div class="stat"><span>'+safe(label)+'</span><b>'+safe(value)+'</b></div>';
  const content = document.querySelector(".content");
  async function load() {
    const [me,jobs,notifications] = await Promise.all([api("/api/auth/me"),api("/api/recruiter/jobs").catch(()=>api("/api/jobs")),api("/api/notifications")]);
    const listed=jobs.items||[];
    const own=listed.filter(job=>!job.recruiter_user_id||job.recruiter_user_id===me.user.id);
    return {me,jobs:own,notifications:notifications.notifications||notifications||[]};
  }
  async function dashboard() {
    const d=await load(), profile=d.me.profile||{}, active=d.jobs.filter(job=>job.status==="published").length, drafts=d.jobs.filter(job=>job.status==="draft").length, unread=d.notifications.filter(item=>!item.read_at&&!item.is_read).length;
    content.innerHTML='<h1>Tableau de bord</h1><p class="form-note">Bienvenue, '+safe(profile.first_name||"")+'</p><div class="stats">'+stat("Offres actives",active)+stat("Brouillons",drafts)+stat("Notifications non lues",unread)+stat("Candidatures re\u00e7ues",0)+'</div><div class="grid-2"><section class="panel"><h2>Offres r\u00e9centes</h2>'+(d.jobs.slice(0,3).map(job=>'<div class="item"><strong>'+safe(job.title)+'</strong><p>'+safe(job.status==="published"?"Publi\u00e9e":"Brouillon")+'</p></div>').join("")||empty("Aucune offre pour le moment."))+'</section><section class="panel"><h2>Notifications r\u00e9centes</h2>'+(d.notifications.slice(0,3).map(note=>'<div class="item"><strong>'+safe(note.title)+'</strong><p>'+safe(note.body)+'</p></div>').join("")||empty("Aucune notification pour le moment."))+'</section></div><a class="button primary" data-go="/recruteur/offres/nouvelle" href="#">Publier une offre</a>';
  }
  async function jobs() {
    const d=await load();content.innerHTML='<h1>Mes offres</h1><p class="form-note">G\u00e9rez les offres publi\u00e9es et vos brouillons.</p>'+(d.jobs.length?d.jobs.map(job=>'<article class="panel"><h2>'+safe(job.title)+'</h2><p>'+safe(job.city)+' - '+safe(job.contract_type)+' - '+safe(job.status)+'</p><p>'+safe(job.description)+'</p></article>').join(""):empty("Aucune offre cr\u00e9\u00e9e."))+'<a class="button primary" data-go="/recruteur/offres/nouvelle" href="#">Nouvelle offre</a>';
  }
  async function notifications() {
    const d=await load();content.innerHTML='<h1>Notifications</h1><button class="button secondary" data-read-all>Tout marquer comme lu</button>'+(d.notifications.length?d.notifications.map(note=>'<article class="panel"><h2>'+safe(note.title)+'</h2><p>'+safe(note.body)+'</p></article>').join(""):empty("Aucune notification pour le moment."));content.querySelector("[data-read-all]")?.addEventListener("click",async()=>{await api("/api/notifications",{method:"POST"});notifications();});
  }
  async function profile() {
    const d=await load(), p=d.me.profile||{};content.innerHTML='<h1>Profil de l\u2019entreprise</h1><form class="panel form" data-company-form><label class="field">Nom de l\u2019entreprise<input name="companyName" value="'+safe(p.company_name)+'"></label><label class="field">Fonction<input name="jobTitle" value="'+safe(p.job_title)+'"></label><label class="field">Domaine d\u2019activit\u00e9<input name="companySector" value="'+safe(p.company_sector)+'"></label><button class="button primary">Enregistrer</button></form>';content.querySelector("[data-company-form]").onsubmit=async event=>{event.preventDefault();await api("/api/profile",{method:"PATCH",body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});profile();};
  }
  async function settings(){content.innerHTML='<h1>Param\u00e8tres</h1><section class="panel"><label class="field">Langue<select data-language-setting><option value="fr">Fran\u00e7ais</option><option value="en">English</option><option value="ar">\u0627\u0644\u0639\u0631\u0628\u064a\u0629</option></select></label><label class="field"><input type="checkbox" checked> Recevoir les notifications de la plateforme</label><label class="field"><input type="checkbox" checked> Recevoir les alertes par e-mail</label></section>';content.querySelector("[data-language-setting]").onchange=event=>{localStorage.setItem("wc_language",event.target.value);location.reload();};}
  async function candidates(){content.innerHTML='<h1>Candidats</h1><section class="panel"><h2>Suivi des candidatures</h2><p>Les candidatures re?ues pour vos offres appara?tront ici d?s qu?un candidat postule.</p><a class="button primary" data-go="/recruteur/offres/nouvelle" href="#">Publier une offre</a></section>';}
  const views={dashboard,jobs,notifications,profile,settings,candidates};
  views[view]?.().catch(error=>{console.error(error);content.innerHTML='<div class="error-banner">Nous n\u2019avons pas pu charger cette page. R\u00e9essayez dans quelques instants.</div>';});
})();
