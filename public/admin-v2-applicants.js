(() => {
  const content = document.querySelector("[data-v2-content]");
  if (!content || !window.adminApi) return;
  const dialog = document.querySelector("[data-v2-dialog]");
  const languages = {
    fr: { kicker:"Candidatures sans compte",title:"Postulants",subtitle:"Étudiez les dossiers transmis depuis le site public.",search:"Rechercher",search_placeholder:"Nom, e-mail, métier ou référence",status:"Statut",filter:"Filtrer",all:"Tous",total:"Total",received:"Reçues",reviewing:"En étude",shortlisted:"Présélectionnées",empty:"Aucun postulant ne correspond à ces critères.",results:"dossier(s)",open:"Ouvrir",contact:"Coordonnées",profile:"Profil professionnel",documents:"Documents",notes:"Notes administratives",history:"Historique",save:"Enregistrer",download:"Télécharger",no_history:"Aucun changement de statut.",saved:"Dossier mis à jour.",load_error:"Impossible de charger les postulants.",received_status:"Reçue",reviewing_status:"En étude",shortlisted_status:"Présélectionnée",interview_status:"Entretien",accepted_status:"Acceptée",refused_status:"Refusée",archived_status:"Archivée"},
    en: { kicker:"Accountless applications",title:"Applicants",subtitle:"Review applications submitted from the public website.",search:"Search",search_placeholder:"Name, email, role or reference",status:"Status",filter:"Filter",all:"All",total:"Total",received:"Received",reviewing:"Under review",shortlisted:"Shortlisted",empty:"No applicants match these criteria.",results:"application(s)",open:"Open",contact:"Contact details",profile:"Professional profile",documents:"Documents",notes:"Administrative notes",history:"History",save:"Save",download:"Download",no_history:"No status changes.",saved:"Application updated.",load_error:"Unable to load applicants.",received_status:"Received",reviewing_status:"Under review",shortlisted_status:"Shortlisted",interview_status:"Interview",accepted_status:"Accepted",refused_status:"Refused",archived_status:"Archived"},
    ar: { kicker:"طلبات من دون حساب",title:"المتقدمون",subtitle:"راجع الملفات المرسلة من الموقع العام.",search:"بحث",search_placeholder:"الاسم أو البريد أو المهنة أو المرجع",status:"الحالة",filter:"تصفية",all:"الكل",total:"الإجمالي",received:"مستلمة",reviewing:"قيد الدراسة",shortlisted:"مختارة أولياً",empty:"لا يوجد متقدمون مطابقون لهذه المعايير.",results:"ملف",open:"فتح",contact:"بيانات الاتصال",profile:"الملف المهني",documents:"الوثائق",notes:"ملاحظات الإدارة",history:"السجل",save:"حفظ",download:"تنزيل",no_history:"لا توجد تغييرات في الحالة.",saved:"تم تحديث الملف.",load_error:"تعذّر تحميل المتقدمين.",received_status:"مستلمة",reviewing_status:"قيد الدراسة",shortlisted_status:"مختارة أولياً",interview_status:"مقابلة",accepted_status:"مقبولة",refused_status:"مرفوضة",archived_status:"مؤرشفة"}
  };
  const statusValues = ["received","reviewing","shortlisted","interview","accepted","refused","archived"];
  let language = localStorage.getItem("workcrute-admin-language") || "fr";
  let page = 1;
  let activeId = null;
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
    content.setAttribute("aria-busy", "true");
    content.innerHTML = '<div class="adm-loading">Chargement…</div>';
    const data = new FormData(document.querySelector("[data-v2-filters]"));
    const query = new URLSearchParams();
    data.forEach((value, key) => { if (value) query.set(key, value); });
    query.set("page", page);
    try {
      const result = await window.adminApi(`/api/admin/v2/applicants?${query}`);
      renderStats(result.stats);
      document.querySelector("[data-v2-count]").textContent = `${result.total} ${t("results")}`;
      content.innerHTML = result.items.length ? `<div class="adm-v2-table"><table><thead><tr><th>${t("title")}</th><th>${t("profile")}</th><th>${t("status")}</th><th></th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${escape(item.first_name)} ${escape(item.last_name)}</strong><small>${escape(item.reference)} · ${formatDate(item.created_at)}</small></td><td>${escape(item.professional_title)}<small>${escape(item.city)}, ${escape(item.country)}</small></td><td><span class="adm-v2-status is-${item.status}">${statusLabel(item.status)}</span></td><td><button class="adm-button" type="button" data-open-id="${item.id}">${t("open")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="adm-empty">${t("empty")}</div>`;
      document.querySelector("[data-v2-pagination]").innerHTML = Array.from({length:result.pages}, (_, index) => `<button type="button" data-page="${index + 1}" ${index + 1 === result.page ? 'aria-current="page"' : ""}>${index + 1}</button>`).join("");
    } catch {
      content.innerHTML = `<div class="adm-empty">${t("load_error")}</div>`;
    } finally {
      content.removeAttribute("aria-busy");
    }
  }

  async function openDetail(id) {
    activeId = id;
    const result = await window.adminApi(`/api/admin/v2/applicants/${encodeURIComponent(id)}`);
    const item = result.item;
    document.querySelector("[data-v2-reference]").textContent = item.reference;
    document.querySelector("[data-v2-name]").textContent = `${item.first_name} ${item.last_name}`;
    document.querySelector("[data-v2-detail]").innerHTML = `
      <section class="adm-v2-detail-grid">
        <div><h3>${t("contact")}</h3><p><a href="mailto:${escape(item.email)}">${escape(item.email)}</a><br><a href="tel:${escape(item.phone)}">${escape(item.phone)}</a><br>${escape(item.city)}, ${escape(item.country)}</p></div>
        <div><h3>${t("profile")}</h3><p><strong>${escape(item.professional_title)}</strong><br>${escape(item.domain_other || item.domain)} · ${escape(item.experience_level)}<br>${escape(item.availability)}</p></div>
      </section>
      <section><h3>${t("documents")}</h3><div class="adm-v2-documents">${result.documents.map((document) => `<a class="adm-button" href="/api/admin/v2/applicants/${item.id}/documents/${document.id}">${t("download")} · ${escape(document.original_name)}</a>`).join("") || "—"}</div></section>
      <form data-v2-update>
        <label><span>${t("status")}</span><select name="status">${statusValues.map((status) => `<option value="${status}" ${status === item.status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}</select></label>
        <label><span>${t("notes")}</span><textarea name="adminNotes" maxlength="4000">${escape(item.admin_notes || "")}</textarea></label>
        <button class="adm-button primary" type="submit">${t("save")}</button>
      </form>
      <section><h3>${t("history")}</h3><div class="adm-v2-history">${result.history.map((entry) => `<p><strong>${statusLabel(entry.next_status)}</strong><span>${formatDate(entry.created_at)}</span></p>`).join("") || t("no_history")}</div></section>`;
    dialog.showModal();
  }

  document.querySelector("[data-v2-filters]").addEventListener("submit", (event) => { event.preventDefault();page=1;load(); });
  content.addEventListener("click", (event) => { const button=event.target.closest("[data-open-id]");if(button)openDetail(button.dataset.openId).catch(()=>toast(t("load_error"))); });
  document.querySelector("[data-v2-pagination]").addEventListener("click", (event) => { const button=event.target.closest("[data-page]");if(button){page=Number(button.dataset.page);load();} });
  document.querySelector("[data-v2-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if(event.target === dialog) dialog.close(); });
  document.querySelector("[data-v2-detail]").addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-v2-update]")) return;
    event.preventDefault();
    const button = event.target.querySelector("button");
    button.disabled = true;
    const data = Object.fromEntries(new FormData(event.target));
    try {
      await window.adminApi(`/api/admin/v2/applicants/${encodeURIComponent(activeId)}`, { method:"PATCH", body:JSON.stringify(data) });
      toast(t("saved"));
      await openDetail(activeId);
      await load();
    } finally { button.disabled = false; }
  });
  document.addEventListener("admin:language", (event) => { language=event.detail.language;applyLanguage();load(); });
  applyLanguage();
  load();
})();
