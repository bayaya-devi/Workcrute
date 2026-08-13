(() => {
  const copy = {
    fr: {
      kicker: "Supervision de la plateforme", title: "Centre de contrôle Workcrute",
      subtitle: "Indicateurs réels et activité récente de la plateforme.", connecting: "Connexion…",
      live: "En direct · actualisation 20 s", offline: "Monitoring interrompu", system: "État du système",
      systemHelp: "Contrôles techniques exécutés côté serveur.", platform: "Plateforme",
      today: "Statistiques du jour", utcNote: "Calculées depuis minuit UTC.",
      activity: "Activité en direct", activityHelp: "Nouveaux événements ajoutés sans recharger la page.",
      retry: "Réessayer", operational: "Opérationnel", degraded: "Dégradé", incident: "Incident",
      database: "Base de données", storage: "Stockage documents", authentication: "Authentification", email: "Service email",
      available: "Disponible", unavailable: "Indisponible", noActivity: "Aucune activité pour ce filtre.",
      loadError: "Impossible de charger le monitoring. Les données affichées n’ont pas été inventées.",
      candidates: "Candidats", recruiters: "Recruteurs", companies: "Entreprises", active_jobs: "Offres actives",
      applications: "Candidatures", referrals: "Profils transmis", interviews: "Entretiens", registrations: "Inscriptions aujourd’hui",
      todayApplications: "Candidatures aujourd’hui", jobs_published: "Offres publiées aujourd’hui",
      interviews_created: "Entretiens créés aujourd’hui", errors: "Erreurs", todayErrors: "Erreurs aujourd’hui",
      all: "Tous", jobs: "Offres", security: "Sécurité",
    },
    en: {
      kicker: "Platform monitoring", title: "Workcrute Control Center", subtitle: "Live platform metrics and recent activity.",
      connecting: "Connecting…", live: "Live · refresh every 20s", offline: "Monitoring interrupted", system: "System status",
      systemHelp: "Technical checks run on the server.", platform: "Platform", today: "Today’s statistics",
      utcNote: "Calculated since midnight UTC.", activity: "Live activity", activityHelp: "New events appear without reloading the page.",
      retry: "Retry", operational: "Operational", degraded: "Degraded", incident: "Incident",
      database: "Database", storage: "Document storage", authentication: "Authentication", email: "Email service",
      available: "Available", unavailable: "Unavailable", noActivity: "No activity for this filter.",
      loadError: "Monitoring could not be loaded. No displayed data has been fabricated.",
      candidates: "Candidates", recruiters: "Recruiters", companies: "Companies", active_jobs: "Active jobs",
      applications: "Applications", referrals: "Profile referrals", interviews: "Interviews", registrations: "Registrations today",
      todayApplications: "Applications today", jobs_published: "Jobs published today",
      interviews_created: "Interviews created today", errors: "Errors", todayErrors: "Errors today", all: "All", jobs: "Jobs", security: "Security",
    },
    ar: {
      kicker: "مراقبة المنصة", title: "مركز تحكم Workcrute", subtitle: "مؤشرات حقيقية وآخر نشاطات المنصة.",
      connecting: "جارٍ الاتصال…", live: "مباشر · تحديث كل 20 ثانية", offline: "توقفت المراقبة", system: "حالة النظام",
      systemHelp: "فحوصات تقنية يتم تنفيذها على الخادم.", platform: "المنصة", today: "إحصاءات اليوم",
      utcNote: "محسوبة منذ منتصف الليل بالتوقيت العالمي.", activity: "النشاط المباشر", activityHelp: "تظهر الأحداث الجديدة دون إعادة تحميل الصفحة.",
      retry: "إعادة المحاولة", operational: "يعمل", degraded: "متدهور", incident: "حادث",
      database: "قاعدة البيانات", storage: "تخزين المستندات", authentication: "المصادقة", email: "خدمة البريد",
      available: "متاح", unavailable: "غير متاح", noActivity: "لا يوجد نشاط لهذا الفلتر.",
      loadError: "تعذر تحميل المراقبة. لم يتم اختلاق أي بيانات معروضة.",
      candidates: "المرشحون", recruiters: "مسؤولو التوظيف", companies: "الشركات", active_jobs: "الوظائف النشطة",
      applications: "طلبات التوظيف", referrals: "الملفات المرسلة", interviews: "المقابلات", registrations: "تسجيلات اليوم",
      todayApplications: "طلبات اليوم", jobs_published: "الوظائف المنشورة اليوم",
      interviews_created: "مقابلات أُنشئت اليوم", errors: "الأخطاء", todayErrors: "أخطاء اليوم", all: "الكل", jobs: "الوظائف", security: "الأمان",
    },
  };
  const events = {
    fr: { USER_REGISTERED:"Nouveau compte inscrit.", USER_LOGIN:"Connexion utilisateur.", USER_LOGOUT:"Déconnexion utilisateur.", PROFILE_UPDATED:"Profil mis à jour.", DOCUMENT_UPLOADED:"Document ajouté.", JOB_CREATED:"Offre créée.", JOB_PUBLISHED:"Offre publiée.", APPLICATION_CREATED:"Candidature envoyée.", APPLICATION_STATUS_CHANGED:"Statut de candidature mis à jour.", INTERVIEW_CREATED:"Entretien créé.", ADMIN_LOGIN:"Connexion administrateur.", ADMIN_SETTING_CHANGED:"Paramètre administrateur modifié.", SYSTEM_ERROR:"Erreur système détectée." },
    en: { USER_REGISTERED:"New account registered.", USER_LOGIN:"User signed in.", USER_LOGOUT:"User signed out.", PROFILE_UPDATED:"Profile updated.", DOCUMENT_UPLOADED:"Document uploaded.", JOB_CREATED:"Job created.", JOB_PUBLISHED:"Job published.", APPLICATION_CREATED:"Application submitted.", APPLICATION_STATUS_CHANGED:"Application status updated.", INTERVIEW_CREATED:"Interview created.", ADMIN_LOGIN:"Administrator signed in.", ADMIN_SETTING_CHANGED:"Administrator setting changed.", SYSTEM_ERROR:"System error detected." },
    ar: { USER_REGISTERED:"تم تسجيل حساب جديد.", USER_LOGIN:"تم تسجيل دخول مستخدم.", USER_LOGOUT:"تم تسجيل خروج مستخدم.", PROFILE_UPDATED:"تم تحديث الملف الشخصي.", DOCUMENT_UPLOADED:"تمت إضافة مستند.", JOB_CREATED:"تم إنشاء وظيفة.", JOB_PUBLISHED:"تم نشر وظيفة.", APPLICATION_CREATED:"تم إرسال طلب توظيف.", APPLICATION_STATUS_CHANGED:"تم تحديث حالة الطلب.", INTERVIEW_CREATED:"تم إنشاء مقابلة.", ADMIN_LOGIN:"تم تسجيل دخول المسؤول.", ADMIN_SETTING_CHANGED:"تم تعديل إعداد إداري.", SYSTEM_ERROR:"تم اكتشاف خطأ في النظام." },
  };
  const totalKeys = ["candidates", "recruiters", "companies", "active_jobs", "applications", "referrals", "interviews"];
  const todayKeys = ["registrations", "applications", "referrals", "jobs_published", "interviews_created", "errors"];
  const filters = ["all", "candidates", "recruiters", "jobs", "applications", "interviews", "security", "errors"];
  const state = { language: localStorage.getItem("workcrute-admin-language") || "fr", category: "all", items: [], lastEventId: 0, timer: null, busy: false, loaded: false, data: null };
  const t = (key) => (copy[state.language] || copy.fr)[key] || key;
  const number = (value) => new Intl.NumberFormat(state.language === "ar" ? "ar" : state.language).format(Number(value) || 0);
  const parseDate = (value) => new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`);

  function renderCopy() {
    document.querySelectorAll("[data-dashboard-copy]").forEach((node) => { node.textContent = t(node.dataset.dashboardCopy); });
    const labels = document.querySelector("[data-filter-label]");
    if (labels) labels.setAttribute("aria-label", state.language === "fr" ? "Filtres d’activité" : state.language === "ar" ? "مرشحات النشاط" : "Activity filters");
    document.title = t("title");
  }
  function statCard(label, value, tone = "") {
    const article = document.createElement("article");
    article.className = `adm-card adm-dashboard-stat ${tone}`.trim();
    const span = document.createElement("span"); span.textContent = label;
    const strong = document.createElement("strong"); strong.textContent = number(value);
    article.append(span, strong);
    return article;
  }
  function renderStats() {
    const totals = document.querySelector("[data-total-stats]");
    const today = document.querySelector("[data-today-stats]");
    if (!totals || !today) return;
    if (!state.data) {
      totals.replaceChildren(...totalKeys.map(() => statCard("…", 0, "loading")));
      today.replaceChildren(...todayKeys.map(() => statCard("…", 0, "loading")));
      return;
    }
    totals.replaceChildren(...totalKeys.map((key) => statCard(t(key), state.data.totals[key])));
    today.replaceChildren(...todayKeys.map((key) => statCard(key === "applications" ? t("todayApplications") : key === "errors" ? t("todayErrors") : t(key), state.data.today[key], key === "errors" && Number(state.data.today[key]) ? "danger" : "")));
  }
  function renderSystem() {
    if (!state.data) return;
    const status = document.querySelector("[data-system-status]");
    status.className = `adm-system-status ${state.data.system.status}`;
    status.textContent = t(state.data.system.status);
    const checks = document.querySelector("[data-system-checks]");
    checks.replaceChildren(...Object.entries(state.data.system.checks).map(([key, ok]) => {
      const item = document.createElement("div"); item.className = `adm-check ${ok ? "ok" : "failed"}`;
      const label = document.createElement("span"); label.textContent = t(key);
      const value = document.createElement("strong"); value.textContent = t(ok ? "available" : "unavailable");
      item.append(label, value); return item;
    }));
  }
  function renderFilters() {
    const root = document.querySelector("[data-activity-filters]");
    root.replaceChildren(...filters.map((key) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "adm-filter"; button.textContent = t(key);
      button.dataset.category = key; button.setAttribute("aria-pressed", String(state.category === key));
      return button;
    }));
  }
  function renderFeed(error = false) {
    const feed = document.querySelector("[data-activity-feed]");
    if (!feed) return;
    feed.setAttribute("aria-busy", "false");
    if (error && !state.items.length) {
      const box = document.createElement("div"); box.className = "adm-error"; box.textContent = t("loadError");
      feed.replaceChildren(box); return;
    }
    if (!state.items.length) {
      const box = document.createElement("div"); box.className = "adm-empty"; box.textContent = t("noActivity");
      feed.replaceChildren(box); return;
    }
    const formatter = new Intl.DateTimeFormat(state.language === "ar" ? "ar" : state.language, { dateStyle:"short", timeStyle:"medium" });
    feed.replaceChildren(...state.items.map((event) => {
      const row = document.createElement("article"); row.className = `adm-event ${event.category}`;
      const time = document.createElement("time"); time.dateTime = event.created_at; time.textContent = formatter.format(parseDate(event.created_at));
      const content = document.createElement("div");
      const message = document.createElement("strong");
      if (event.event_type === "CANDIDATE_REFERRAL_CREATED") {
        message.textContent = state.language === "fr" ? "Profil candidat transmis à un recruteur." : state.language === "ar" ? "تم إرسال ملف مرشح إلى مسؤول توظيف." : "Candidate profile sent to a recruiter.";
      } else if (event.event_type === "USER_REGISTERED") {
        message.textContent = state.language === "fr"
          ? event.category === "recruiters" ? "Nouveau recruteur inscrit." : "Nouveau candidat inscrit."
          : state.language === "ar"
            ? event.category === "recruiters" ? "تم تسجيل مسؤول توظيف جديد." : "تم تسجيل مرشح جديد."
            : event.category === "recruiters" ? "New recruiter registered." : "New candidate registered.";
      } else message.textContent = (events[state.language] || events.fr)[event.event_type] || event.event_type;
      const category = document.createElement("span"); category.className = "adm-event-category"; category.textContent = t(event.category);
      content.append(message, category); row.append(time, content); return row;
    }));
  }
  function setLive(ok) {
    const node = document.querySelector("[data-live-state]");
    if (!node) return;
    node.classList.toggle("offline", !ok); node.querySelector("span").textContent = t(ok ? "live" : "offline");
  }
  function render() { renderCopy(); renderStats(); renderSystem(); renderFilters(); renderFeed(); setLive(state.loaded); }

  async function load(reset = false) {
    if (state.busy || document.hidden) return;
    state.busy = true;
    if (reset) { state.items = []; state.lastEventId = 0; state.loaded = false; document.querySelector("[data-activity-feed]")?.setAttribute("aria-busy", "true"); }
    const retry = document.querySelector("[data-dashboard-retry]");
    try {
      const params = new URLSearchParams();
      if (state.lastEventId) params.set("after", String(state.lastEventId));
      if (state.category !== "all") params.set("category", state.category);
      const data = await adminApi(`/api/admin/dashboard?${params}`);
      state.data = data;
      if (reset || !state.loaded) state.items = data.activity;
      else if (data.activity.length) {
        const known = new Set(state.items.map((item) => item.id));
        state.items = [...data.activity.filter((item) => !known.has(item.id)), ...state.items].slice(0, 100);
      }
      state.lastEventId = Math.max(state.lastEventId, Number(data.lastEventId) || 0);
      state.loaded = true; retry.hidden = true; render();
      clearTimeout(state.timer); state.timer = setTimeout(() => load(), Math.max(15000, Math.min(30000, data.pollAfterMs || 20000)));
    } catch {
      retry.hidden = false; setLive(false); renderFeed(true);
      clearTimeout(state.timer); state.timer = setTimeout(() => load(), 30000);
    } finally { state.busy = false; }
  }
  document.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-category]");
    if (filter && filter.dataset.category !== state.category) { state.category = filter.dataset.category; renderFilters(); load(true); }
    if (event.target.closest("[data-dashboard-retry]")) load(!state.loaded);
  });
  document.addEventListener("admin:language", (event) => { state.language = event.detail.language; render(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); else clearTimeout(state.timer); });
  document.addEventListener("admin:ready", () => { render(); load(true); });
  renderCopy(); renderStats(); renderFilters();
})();
