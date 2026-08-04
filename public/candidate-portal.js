(() => {
  const api = window.workcrute?.api;
  if (!api || !document.body.matches('[data-protected="candidate"]')) return;
  const view = document.body.dataset.candidateView;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const normalise = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const date = value => new Intl.DateTimeFormat(document.documentElement.lang || "fr", { dateStyle:"medium" }).format(new Date(value));
  const status = { submitted:"Envoy\u00e9e", reviewing:"Consult\u00e9e", shortlisted:"Pr\u00e9s\u00e9lectionn\u00e9e", interview:"Entretien propos\u00e9", accepted:"Accept\u00e9e", rejected:"Refus\u00e9e", withdrawn:"Retir\u00e9e" };
  const content = document.querySelector(".content");
  const message = text => '<div class="empty-state"><p>'+escape(text)+'</p></div>';
  const stat = (label, value) => '<div class="stat"><span>'+escape(label)+'</span><b>'+escape(value)+'</b></div>';
  async function data() {
    const [me, applications, notifications, jobs, documents] = await Promise.all([
      api("/api/auth/me"), api("/api/applications"), api("/api/notifications"), api("/api/jobs"), api("/api/documents")
    ]);
    return { me, applications:applications.items || [], notifications:notifications.notifications || notifications || [], jobs:jobs.items || [], documents:documents.documents || documents || [] };
  }
  function completion(profile, documents) {
    const keys=["first_name","last_name","phone","city","professional_title","introduction","availability"];
    return Math.round((keys.filter(key => profile?.[key]).length + (documents.length ? 1 : 0)) / (keys.length + 1) * 100);
  }
  async function dashboard() {
    const d=await data(), profile=d.me.profile || {}, sent=d.applications.length, waiting=d.applications.filter(item=>["submitted","reviewing"].includes(item.status)).length, progressing=d.applications.filter(item=>["shortlisted","interview"].includes(item.status)).length, unread=d.notifications.filter(item=>!item.read_at&&!item.is_read).length, complete=completion(profile,d.documents);
    content.innerHTML='<h1>Tableau de bord</h1><p class="form-note">Bienvenue, '+escape(profile.first_name || "");+'</p><div class="stats">'+stat("Candidatures envoy\u00e9es",sent)+stat("En attente",waiting)+stat("En cours",progressing)+stat("Notifications non lues",unread)+stat("Profil compl\u00e9t\u00e9",complete+" %")+'</div><div class="grid-2"><section class="panel"><h2>Dernieres candidatures</h2>'+(d.applications.slice(0,3).map(item=>'<div class="item"><strong>'+escape(item.title)+'</strong><p>'+escape(item.company_name || "")+' - '+status[item.status]+'</p></div>').join("")||message("Aucune candidature pour le moment."))+'</section><section class="panel"><h2>Action prioritaire</h2><p>'+(complete<100?"Compl\u00e9tez votre profil et ajoutez votre CV pour am\u00e9liorer votre visibilit\u00e9.":"Votre profil est complet. D\u00e9couvrez les offres qui vous correspondent.")+'</p><a class="button primary" data-go="/demandeur/'+(complete<100?"profil":"offres")+'" href="#">'+(complete<100?"Compl\u00e9ter mon profil":"Voir les offres")+'</a></section></div>';
  }
  async function offers() {
    const d=await data(), domains=[...new Set(d.jobs.map(job=>job.domain).filter(Boolean))];
    content.innerHTML='<h1>Offres d\u2019emploi</h1><p class="form-note">D\u00e9couvrez les opportunit\u00e9s correspondant \u00e0 votre profil.</p><div class="filters"><input data-job-search placeholder="Rechercher un m\u00e9tier, une entreprise ou une comp\u00e9tence"><select data-job-domain><option value="">Tous les domaines</option>'+domains.map(value=>'<option>'+escape(value)+'</option>').join("")+'</select><button class="button secondary" data-alert>Cr\u00e9er une alerte</button></div><section data-offers></section>';
    const target=content.querySelector("[data-offers]"), search=content.querySelector("[data-job-search]"), domain=content.querySelector("[data-job-domain]");
    const render=()=>{const query=normalise(search.value), selected=domain.value;const items=d.jobs.filter(job=>{const text=normalise([job.title,job.description,job.domain,job.company_name].join(" "));return (!query||text.includes(query)||query.split(" ").every(token=>text.includes(token)))&&(!selected||job.domain===selected)});target.innerHTML=items.length?items.map(job=>'<article class="panel"><h2>'+escape(job.title)+'</h2><p>'+escape(job.company_name || "Entreprise")+' - '+escape(job.city)+' - '+escape(job.contract_type)+'</p><p>'+escape(job.description)+'</p><button class="button primary" data-apply="'+escape(job.id)+'">Postuler</button></article>').join(""):message("Aucune offre disponible pour le moment.");target.querySelectorAll("[data-apply]").forEach(button=>button.onclick=async()=>{await api("/api/applications",{method:"POST",body:JSON.stringify({jobId:button.dataset.apply})});button.disabled=true;button.textContent="Candidature envoy\u00e9e";});};
    search.oninput=render;domain.onchange=render;render();
  }
  async function applications() {
    const d=await data();content.innerHTML='<h1>Mes candidatures</h1><p class="form-note">Suivez chaque \u00e9tape de vos d\u00e9marches.</p>'+(d.applications.length?d.applications.map(item=>'<article class="panel"><h2>'+escape(item.title)+'</h2><p>'+escape(item.company_name || "Entreprise")+' - Envoy\u00e9e le '+date(item.created_at)+'</p><span class="status blue">'+status[item.status]+'</span></article>').join(""):message("Vous n\u2019avez pas encore de candidature."));
  }
  async function notifications() {
    const d=await data();content.innerHTML='<h1>Notifications</h1><p class="form-note">Vos offres, candidatures et informations importantes.</p><button class="button secondary" data-read-all>Tout marquer comme lu</button><section class="notification-list">'+(d.notifications.length?d.notifications.map(item=>'<article class="panel '+(!item.read_at&&!item.is_read?"notice":"")+'"><h2>'+escape(item.title)+'</h2><p>'+escape(item.body)+'</p><small>'+date(item.created_at || Date.now())+'</small></article>').join(""):message("Aucune notification pour le moment."))+'</section>';content.querySelector("[data-read-all]")?.addEventListener("click",async()=>{await api("/api/notifications",{method:"POST"});notifications();});
  }
  async function profile() {
    const d=await data(), p=d.me.profile || {};content.innerHTML='<h1>Mon profil</h1><p class="form-note">Vos informations professionnelles et vos documents.</p><form class="panel form" data-profile-form><div class="grid-2"><label class="field">Pr\u00e9nom<input name="firstName" value="'+escape(p.first_name)+'"></label><label class="field">Nom<input name="lastName" value="'+escape(p.last_name)+'"></label></div><label class="field">Titre professionnel<input name="professionalTitle" value="'+escape(p.professional_title)+'"></label><label class="field">Ville<input name="city" value="'+escape(p.city)+'"></label><label class="field">Pr\u00e9sentation<textarea name="introduction">'+escape(p.introduction)+'</textarea></label><label class="field">Disponibilit\u00e9<input name="availability" value="'+escape(p.availability)+'"></label><button class="button primary">Enregistrer</button></form><section class="panel"><h2>Documents</h2>'+(d.documents.length?d.documents.map(doc=>'<div class="item"><strong>'+escape(doc.original_name)+'</strong><p>'+escape(doc.kind)+' - '+Math.round((doc.size_bytes||0)/1024)+' Ko</p></div>').join(""):message("Aucun document ajout\u00e9."))+'</section>';content.querySelector("[data-profile-form]").onsubmit=async event=>{event.preventDefault();await api("/api/profile",{method:"PATCH",body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});profile();};
  }
  async function settings() {
    const {me}=await data();content.innerHTML='<h1>Param\u00e8tres</h1><p class="form-note">Langue, confidentialit\u00e9 et pr\u00e9f\u00e9rences de votre compte.</p><section class="panel"><label class="field">Langue<select data-setting-language><option value="fr">Fran\u00e7ais</option><option value="en">English</option><option value="ar">\u0627\u0644\u0639\u0631\u0628\u064a\u0629</option></select></label><label class="field"><input type="checkbox" checked> Recevoir les notifications dans l\u2019application</label><label class="field"><input type="checkbox" checked> Recevoir les alertes par e-mail</label><p class="form-note">Votre adresse e-mail est disponible uniquement dans les r\u00e9glages de s\u00e9curit\u00e9.</p></section>';const select=content.querySelector("[data-setting-language]");select.value=me.profile?.preferred_language || "fr";select.onchange=async()=>{localStorage.setItem("wc_language",select.value);await api("/api/profile",{method:"PATCH",body:JSON.stringify({language:select.value})});location.reload();};
  }
  const views={dashboard,offers,applications,notifications,profile,settings};
  views[view]?.().catch(error=>{content.innerHTML='<div class="error-banner">Nous n\u2019avons pas pu charger cette page. R\u00e9essayez dans quelques instants.</div>';console.error(error);});
})();
