(() => {
  const content = document.querySelector("[data-v2-content]");
  if (!content || !window.adminApi) return;
  const dialog = document.querySelector("[data-v2-dialog]");
  const languages = {
    fr: { kicker:"Candidatures sans compte",title:"Postulants",subtitle:"Étudiez les dossiers transmis depuis le site public.",search:"Rechercher",search_placeholder:"Nom, e-mail, métier ou référence",status:"Statut",filter:"Filtrer",all:"Tous",total:"Total",received:"Reçues",reviewing:"En étude",shortlisted:"Présélectionnées",empty:"Aucun postulant ne correspond à ces critères.",results:"dossier(s)",open:"Ouvrir",contact:"Coordonnées",profile:"Profil professionnel",documents:"Documents",notes:"Notes administratives",history:"Historique",save:"Enregistrer",download:"Télécharger",no_history:"Aucun changement de statut.",saved:"Dossier mis à jour.",load_error:"Impossible de charger les postulants.",received_status:"Reçu",reviewing_status:"En étude",shortlisted_status:"Présélectionné",interview_status:"Entretien",accepted_status:"Accepté",refused_status:"Refusé",archived_status:"Archivé"},
    en: { kicker:"Accountless applications",title:"Applicants",subtitle:"Review applications submitted from the public website.",search:"Search",search_placeholder:"Name, email, role or reference",status:"Status",filter:"Filter",all:"All",total:"Total",received:"Received",reviewing:"Under review",shortlisted:"Shortlisted",empty:"No applicants match these criteria.",results:"application(s)",open:"Open",contact:"Contact details",profile:"Professional profile",documents:"Documents",notes:"Administrative notes",history:"History",save:"Save",download:"Download",no_history:"No status changes.",saved:"Application updated.",load_error:"Unable to load applicants.",received_status:"Received",reviewing_status:"Under review",shortlisted_status:"Shortlisted",interview_status:"Interview",accepted_status:"Accepted",refused_status:"Refused",archived_status:"Archived"},
    ar: { kicker:"طلبات من دون حساب",title:"المتقدمون",subtitle:"راجع الملفات المرسلة من الموقع العام.",search:"بحث",search_placeholder:"الاسم أو البريد أو المهنة أو المرجع",status:"الحالة",filter:"تصفية",all:"الكل",total:"الإجمالي",received:"مستلمة",reviewing:"قيد الدراسة",shortlisted:"مختارة أولياً",empty:"لا يوجد متقدمون مطابقون لهذه المعايير.",results:"ملف",open:"فتح",contact:"بيانات الاتصال",profile:"الملف المهني",documents:"الوثائق",notes:"ملاحظات الإدارة",history:"السجل",save:"حفظ",download:"تنزيل",no_history:"لا توجد تغييرات في الحالة.",saved:"تم تحديث الملف.",load_error:"تعذّر تحميل المتقدمين.",received_status:"مستلمة",reviewing_status:"قيد الدراسة",shortlisted_status:"مختارة أولياً",interview_status:"مقابلة",accepted_status:"مقبولة",refused_status:"مرفوضة",archived_status:"مؤرشفة"}
  };
  Object.assign(languages.fr, { administrator:"Administrateur",note_added:"Note ajoutée",entered:"Données saisies",presentation:"Présentation",responses:"Réponses" });
  Object.assign(languages.en, { administrator:"Administrator",note_added:"Note added",entered:"Submitted information",presentation:"Introduction",responses:"Answers" });
  Object.assign(languages.ar, { administrator:"المسؤول",note_added:"ملاحظة مضافة",entered:"البيانات المقدمة",presentation:"التقديم",responses:"الإجابات" });
  Object.assign(languages.fr,{"first_name":"Prénom","last_name":"Nom","email":"E-mail","phone":"Téléphone","city":"Ville","country":"Pays","professional_title":"Métier","domain":"Domaine","experience_level":"Expérience","availability":"Disponibilité","motivation":"Présentation","preferred_language":"Langue","work_modes":"Modes de travail","yes":"Oui","no":"Non","it":"Informatique","sales":"Commerce","marketing":"Marketing","hr":"Ressources humaines","finance":"Finance","logistics":"Logistique","industry":"Industrie","other":"Autre","entry":"0–1 an","junior":"1–3 ans","confirmed":"3–5 ans","senior":"5 ans et plus","immediate":"Immédiatement","one_month":"Dans un mois","two_months":"Dans deux mois","fr":"Français","en":"Anglais","ar":"Arabe","onsite":"Sur site","hybrid":"Hybride","remote":"À distance"});
  Object.assign(languages.en,{"first_name":"First name","last_name":"Last name","email":"Email","phone":"Phone","city":"City","country":"Country","professional_title":"Role","domain":"Field","experience_level":"Experience","availability":"Availability","motivation":"Introduction","preferred_language":"Language","work_modes":"Working arrangements","yes":"Yes","no":"No","it":"IT","sales":"Sales","marketing":"Marketing","hr":"Human resources","finance":"Finance","logistics":"Logistics","industry":"Industry","other":"Other","entry":"0–1 year","junior":"1–3 years","confirmed":"3–5 years","senior":"5+ years","immediate":"Immediately","one_month":"In one month","two_months":"In two months","fr":"French","en":"English","ar":"Arabic","onsite":"On-site","hybrid":"Hybrid","remote":"Remote"});
  Object.assign(languages.ar,{"first_name":"الاسم الشخصي","last_name":"اسم العائلة","email":"البريد الإلكتروني","phone":"الهاتف","city":"المدينة","country":"البلد","professional_title":"المهنة","domain":"المجال","experience_level":"الخبرة","availability":"التوفر","motivation":"التقديم","preferred_language":"اللغة","work_modes":"أنماط العمل","yes":"نعم","no":"لا","it":"المعلوماتية","sales":"التجارة","marketing":"التسويق","hr":"الموارد البشرية","finance":"المالية","logistics":"الخدمات اللوجستية","industry":"الصناعة","other":"أخرى","entry":"أقل من سنة","junior":"من سنة إلى ثلاث سنوات","confirmed":"من ثلاث إلى خمس سنوات","senior":"خمس سنوات فأكثر","immediate":"فوراً","one_month":"خلال شهر","two_months":"خلال شهرين","fr":"الفرنسية","en":"الإنجليزية","ar":"العربية","onsite":"في الموقع","hybrid":"هجين","remote":"عن بعد"});
  const statusValues = ["received","reviewing","shortlisted","interview","accepted","refused","archived"];
  let language = localStorage.getItem("workcrute-admin-language") || "fr";
  let page = 1;
  let activeId = null;
  let requestVersion = 0;
  let detailVersion = 0;
  const t = (key) => languages[language]?.[key] || languages.fr[key] || key;
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
  const statusLabel = (status) => t(`${status}_status`);
  const formatDate = (value) => value ? new Intl.DateTimeFormat(language, { dateStyle:"medium", timeStyle:"short" }).format(new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"))) : "—";
  const toast = (message) => { const node=document.querySelector("[data-v2-toast]");node.textContent=message;node.hidden=false;setTimeout(()=>{node.hidden=true;},3000); };

  function applyLanguage() {
    document.querySelectorAll("[data-v2a-i18n]").forEach((node) => { node.textContent = t(node.dataset.v2aI18n); });
    document.querySelectorAll("[data-v2a-placeholder]").forEach((node) => { node.placeholder = t(node.dataset.v2aPlaceholder); });
    const select = document.querySelector("[data-status-filter]");
    const selected = select.value;
    select.innerHTML = `<option value="">${t("all")}</option>${statusValues.map((status) => `<option value="${status}">${statusLabel(status)}</option>`).join("")}`;
    select.value = selected;
  }

  function renderStats(stats) {
    document.querySelector("[data-v2-stats]").innerHTML = [
      ["total", stats.total],
      ["received", stats.received],
      ["reviewing", stats.reviewing],
      ["shortlisted", stats.shortlisted],
    ].map(([label, value]) => `<article><span>${t(label)}</span><strong>${Number(value || 0)}</strong></article>`).join("");
  }

  async function load() {
    const version = ++requestVersion;
    content.setAttribute("aria-busy", "true");
    content.innerHTML = `<div class="adm-loading">${escape({fr:'Chargement…',en:'Loading…',ar:'جارٍ التحميل…'}[language])}</div>`;
    const data = new FormData(document.querySelector("[data-v2-filters]"));
    const query = new URLSearchParams();
    data.forEach((value, key) => { if (value) query.set(key, value); });
    query.set("page", page);
    try {
      const result = await window.adminApi(`/api/admin/v2/applicants?${query}`);
      if (version !== requestVersion) return;
      const requested=new URLSearchParams(location.search).get("open");if(requested&&result.items.some(item=>item.id===requested)){const url=new URL(location.href);url.searchParams.delete("open");history.replaceState(null,"",url);openDetail(requested).catch(()=>toast(t("load_error")));}
      document.querySelector("[data-v2-count]").textContent = `${result.total} ${t("results")}`;
      content.innerHTML = result.items.length ? `<div class="adm-v2-table"><table><thead><tr><th>${t("title")}</th><th>${t("profile")}</th><th>${t("status")}</th><th></th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${escape(item.first_name)} ${escape(item.last_name)}</strong><small>${escape(item.reference)} · ${formatDate(item.created_at)}</small></td><td>${escape(item.professional_title)}<small>${escape(item.city)}, ${escape(item.country)}</small></td><td><span class="adm-v2-status is-${item.status}">${statusLabel(item.status)}</span></td><td><button class="adm-button" type="button" data-open-id="${item.id}">${t("open")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="adm-empty">${t("empty")}</div>`;
      document.querySelector("[data-v2-pagination]").innerHTML = Array.from({length:result.pages}, (_, index) => `<button type="button" data-page="${index + 1}" ${index + 1 === result.page ? 'aria-current="page"' : ""}>${index + 1}</button>`).join("");
    } catch {
      if (version !== requestVersion) return;
      content.innerHTML = `<div class="adm-empty">${t("load_error")}</div>`;
    } finally {
      content.removeAttribute("aria-busy");
    }
  }

  async function openDetail(id) {
    const version=++detailVersion;
    const result = await window.adminApi(`/api/admin/v2/applicants/${encodeURIComponent(id)}`);
    if(version!==detailVersion)return;
    activeId=id;
    const item = result.item;
    document.querySelector("[data-v2-reference]").textContent = item.reference;
    document.querySelector("[data-v2-name]").textContent = `${item.first_name} ${item.last_name}`;
    const fields = ['first_name','last_name','email','phone','city','country','professional_title','domain','experience_level','availability','motivation','preferred_language'].map(key=>[t(key), ['domain','experience_level','availability','preferred_language'].includes(key)?(key==='domain'&&item.domain_other?item.domain_other:t(item[key])):item[key]]);
    for(const [key,value] of Object.entries(item.answers||{})){const label=key==='workModes'?t('work_modes'):item.answerLabels?.[key]?.[language]||t('responses');fields.push([label,Array.isArray(value)?value.map(t).join(', '):typeof value==='boolean'?t(value?'yes':'no'):String(value??'')]);}
    document.querySelector("[data-v2-detail]").innerHTML = `
      <form data-v2-update>
        <details open><summary>${t("entered")}</summary><dl>${fields.filter(([,value])=>value).map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl></details>
        <details open><summary>${t("documents")}</summary><div class="adm-v2-documents">${result.documents.map(document=>`<a class="adm-button" href="/api/admin/v2/applicants/${item.id}/documents/${document.id}">${t("download")} · ${escape(document.original_name)}</a>`).join("") || "—"}</div></details>
        <details open><summary>${t("status")}</summary><label><span>${t("status")}</span><select name="status">${statusValues.map(status=>`<option value="${status}" ${status===item.status?"selected":""}>${statusLabel(status)}</option>`).join("")}</select></label></details>
        <details open><summary>${t("notes")}</summary><label><span>${t("notes")}</span><textarea name="newNote" maxlength="4000"></textarea></label><div class="adm-v2-note-list">${(result.notes || []).map(note=>`<article><p>${escape(note.content)}</p><small>${formatDate(note.created_at)} · ${escape(note.admin_identifier || t("administrator"))}</small></article>`).join("")}</div></details>
        <details><summary>${t("history")}</summary><div class="adm-v2-history">${result.history.map(entry=>`<p><strong>${entry.event_type==="note"?t("note_added"):statusLabel(entry.next_status)}</strong><span>${formatDate(entry.created_at)}${entry.note?` · ${escape(entry.note)}`:""}</span></p>`).join("") || t("no_history")}</div></details>
        <div data-detail-error role="alert"></div><button class="adm-button primary" type="submit">${t("save")}</button>
      </form>`;
    if (!dialog.open) dialog.showModal();
  }

  document.querySelector("[data-v2-filters]").addEventListener("submit", (event) => { event.preventDefault();page=1;load(); });
  document.querySelector("[data-status-filter]").addEventListener("change", () => { page=1;load(); });
  const searchInput=document.querySelector('[data-v2-filters] [name=q]');
  searchInput.value=new URLSearchParams(location.search).get("q") || "";
  let searchTimer;
  searchInput.addEventListener("input", () => { clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;load();},250); });
  content.addEventListener("click", (event) => { const button=event.target.closest("[data-open-id]");if(button)openDetail(button.dataset.openId).catch(()=>toast(t("load_error"))); });
  document.querySelector("[data-v2-pagination]").addEventListener("click", (event) => { const button=event.target.closest("[data-page]");if(button){page=Number(button.dataset.page);load();} });
  document.querySelector("[data-v2-close]").addEventListener("click", () => {detailVersion++;activeId=null;dialog.close();});
  dialog.addEventListener("cancel",()=>{detailVersion++;activeId=null;});
  dialog.addEventListener("click", (event) => { if(event.target === dialog){detailVersion++;activeId=null;dialog.close();} });
  document.querySelector("[data-v2-detail]").addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-v2-update]")) return;
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    button.disabled = true;
    const data = Object.fromEntries(new FormData(event.target));
    try {
      await window.adminApi(`/api/admin/v2/applicants/${encodeURIComponent(activeId)}`, { method:"PATCH", body:JSON.stringify(data) });
      toast(t("saved"));
      await openDetail(activeId);
      await load();
    } catch (error) { event.target.querySelector("[data-detail-error]").textContent=error.message || t("load_error"); } finally { button.disabled = false; }
  });
  document.addEventListener("admin:language", (event) => { language=event.detail.language;applyLanguage();load();if(dialog.open&&activeId){const form=dialog.querySelector("form"),pending={status:form.elements.status.value,newNote:form.elements.newNote.value},id=activeId;openDetail(id).then(()=>{if(dialog.open&&activeId===id)Object.entries(pending).forEach(([key,value])=>dialog.querySelector("form").elements[key].value=value);}).catch(()=>toast(t("load_error")));} });
  applyLanguage();
  const initialStatus=new URLSearchParams(location.search).get("status");
  if(['received','reviewing','shortlisted','interview','accepted','refused','archived'].includes(initialStatus))document.querySelector('[data-status-filter]').value=initialStatus;
  load();
})();
