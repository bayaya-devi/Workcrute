(() => {
  const messages = {
    fr: {
      chatbot: "Chatbot / FAQ",
      dashboard: "Centre de contrôle",
      activity: "Activité",
      candidates: "Candidats",
      recruiters: "Recruteurs",
      companies: "Entreprises",
      jobs: "Offres",
      applications: "Candidatures",
      interviews: "Entretiens",
      questionnaires: "Questionnaires",
      notifications: "Notifications",
      audit: "Journal d’audit",
      settings: "Paramètres",
      security: "Sécurité",
      logout: "Déconnexion",
      search: "Rechercher un candidat, recruteur, email, offre ou ID…",
      administrator: "Administrateur",
      control: "Workcrute Control Center",
    },
    en: {
      chatbot: "Chatbot / FAQ",
      dashboard: "Control Center",
      activity: "Activity",
      candidates: "Candidates",
      recruiters: "Recruiters",
      companies: "Companies",
      jobs: "Jobs",
      applications: "Applications",
      interviews: "Interviews",
      questionnaires: "Questionnaires",
      notifications: "Notifications",
      audit: "Audit log",
      settings: "Settings",
      security: "Security",
      logout: "Log out",
      search: "Search a candidate, recruiter, email, job or ID…",
      administrator: "Administrator",
      control: "Workcrute Control Center",
    },
    ar: {
      chatbot: "المساعد / الأسئلة",
      dashboard: "مركز التحكم",
      activity: "النشاط",
      candidates: "المرشحون",
      recruiters: "مسؤولو التوظيف",
      companies: "الشركات",
      jobs: "الوظائف",
      applications: "الطلبات",
      interviews: "المقابلات",
      questionnaires: "الاستبيانات",
      notifications: "الإشعارات",
      audit: "سجل التدقيق",
      settings: "الإعدادات",
      security: "الأمان",
      logout: "تسجيل الخروج",
      search: "ابحث عن مرشح أو مسؤول توظيف أو بريد أو وظيفة أو معرّف…",
      administrator: "المسؤول",
      control: "مركز تحكم Workcrute",
    },
  };
  const apply = (language) => {
    const lang = messages[language] ? language : "fr";
    localStorage.setItem("workcrute-admin-language", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-adm-i18n]").forEach((node) => {
      const value = messages[lang][node.dataset.admI18n];
      if (value) node.textContent = value;
    });
    document.querySelectorAll("[data-adm-i18n-placeholder]").forEach((node) => {
      const value = messages[lang][node.dataset.admI18nPlaceholder];
      if (value) node.placeholder = value;
    });
    document
      .querySelectorAll("[data-admin-language]")
      .forEach((select) => (select.value = lang));
    document.dispatchEvent(
      new CustomEvent("admin:language", { detail: { language: lang } }),
    );
  };
  window.workcruteAdminI18n = { apply, messages };
  apply(localStorage.getItem("workcrute-admin-language") || "fr");
  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-admin-language]"))
      apply(event.target.value);
  });
})();
