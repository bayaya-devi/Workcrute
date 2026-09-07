(() => {
  if (!window.WorkcruteErrors && !document.querySelector('script[data-error-system]')) { const script=document.createElement("script");script.dataset.errorSystem="";script.src="/error-system.js";document.head.append(script); }
  const messages = {
    fr: {
      referrals: "Transmissions",
      chatbot: "Chatbot / FAQ",
      dashboard: "Centre de contrôle",
      activity: "Activité",
      candidates: "Candidats",
      applicants: "Postulants",
      employees: "Employés",
      leave: "Congés",
      recruiters: "Recruteurs",
      companies: "Entreprises",
      jobs: "Offres",
      applications: "Candidatures",
      interviews: "Entretiens",
      questionnaires: "Questionnaires",
      notifications: "Notifications",
      errors: "Erreurs",
      audit: "Journal d’audit",
      settings: "Paramètres",
      security: "Sécurité",
      v2_identity: "Identité de connexion",
      logout: "Déconnexion",
      search: "Rechercher un candidat, recruteur, email, offre ou ID…",
      administrator: "Administrateur",
      control: "Workcrute Control Center",
      v2_employees_title:"Employés",v2_employees_copy:"Créez et gérez les accès des employés. Aucun employé ne peut s’inscrire lui-même.",v2_create_employee:"Créer un employé",v2_search:"Rechercher",v2_employee_search:"Nom, e-mail ou fonction",v2_status:"Statut",v2_all:"Tous",v2_active:"Actif",v2_disabled:"Désactivé",v2_filter:"Filtrer",v2_leave_title:"Congés",v2_leave_copy:"Traitez les demandes et configurez les jours fériés exclus du calcul.",v2_requests:"Demandes",v2_holidays:"Jours fériés",v2_date:"Date",v2_label:"Libellé",v2_add:"Ajouter",v2_identity_title:"Identité de connexion",v2_identity_copy:"Configurez l’unique compte administrateur utilisé sur la page de connexion publique.",v2_first_name:"Prénom",v2_last_name:"Nom",v2_new_password:"Nouveau mot de passe",v2_confirmation:"Confirmation",v2_save_identity:"Enregistrer l’identité V2",v2_job_title:"Fonction",v2_department:"Service",v2_email:"E-mail",v2_phone:"Téléphone",v2_hire_date:"Date d’entrée",v2_language:"Langue",v2_password:"Mot de passe",v2_cancel:"Annuler",v2_save:"Enregistrer",
    },
    en: {
      referrals: "Referrals",
      chatbot: "Chatbot / FAQ",
      dashboard: "Control Center",
      activity: "Activity",
      candidates: "Candidates",
      applicants: "Applicants",
      employees: "Employees",
      leave: "Leave",
      recruiters: "Recruiters",
      companies: "Companies",
      jobs: "Jobs",
      applications: "Applications",
      interviews: "Interviews",
      questionnaires: "Questionnaires",
      notifications: "Notifications",
      errors: "Errors",
      audit: "Audit log",
      settings: "Settings",
      security: "Security",
      v2_identity: "Sign-in identity",
      logout: "Log out",
      search: "Search a candidate, recruiter, email, job or ID…",
      administrator: "Administrator",
      control: "Workcrute Control Center",
      v2_employees_title:"Employees",v2_employees_copy:"Create and manage employee access. Employees cannot register themselves.",v2_create_employee:"Create employee",v2_search:"Search",v2_employee_search:"Name, email or role",v2_status:"Status",v2_all:"All",v2_active:"Active",v2_disabled:"Disabled",v2_filter:"Filter",v2_leave_title:"Leave",v2_leave_copy:"Process requests and configure public holidays excluded from calculations.",v2_requests:"Requests",v2_holidays:"Public holidays",v2_date:"Date",v2_label:"Label",v2_add:"Add",v2_identity_title:"Sign-in identity",v2_identity_copy:"Configure the single administrator account used on the public sign-in page.",v2_first_name:"First name",v2_last_name:"Last name",v2_new_password:"New password",v2_confirmation:"Confirmation",v2_save_identity:"Save V2 identity",v2_job_title:"Role",v2_department:"Department",v2_email:"Email",v2_phone:"Phone",v2_hire_date:"Start date",v2_language:"Language",v2_password:"Password",v2_cancel:"Cancel",v2_save:"Save",
    },
    ar: {
      referrals: "الملفات المرسلة",
      chatbot: "المساعد / الأسئلة",
      dashboard: "مركز التحكم",
      activity: "النشاط",
      candidates: "المرشحون",
      applicants: "المتقدمون",
      employees: "الموظفون",
      leave: "الإجازات",
      recruiters: "مسؤولو التوظيف",
      companies: "الشركات",
      jobs: "الوظائف",
      applications: "الطلبات",
      interviews: "المقابلات",
      questionnaires: "الاستبيانات",
      notifications: "الإشعارات",
      errors: "الأخطاء",
      audit: "سجل التدقيق",
      settings: "الإعدادات",
      security: "الأمان",
      v2_identity: "هوية تسجيل الدخول",
      logout: "تسجيل الخروج",
      search: "ابحث عن مرشح أو مسؤول توظيف أو بريد أو وظيفة أو معرّف…",
      administrator: "المسؤول",
      control: "مركز تحكم Workcrute",
      v2_employees_title:"الموظفون",v2_employees_copy:"أنشئ صلاحيات الموظفين وأدرها. لا يمكن للموظف إنشاء حساب بنفسه.",v2_create_employee:"إنشاء موظف",v2_search:"بحث",v2_employee_search:"الاسم أو البريد أو الوظيفة",v2_status:"الحالة",v2_all:"الكل",v2_active:"نشط",v2_disabled:"معطّل",v2_filter:"تصفية",v2_leave_title:"الإجازات",v2_leave_copy:"عالج الطلبات واضبط أيام العطل المستثناة من الحساب.",v2_requests:"الطلبات",v2_holidays:"أيام العطل",v2_date:"التاريخ",v2_label:"التسمية",v2_add:"إضافة",v2_identity_title:"هوية تسجيل الدخول",v2_identity_copy:"اضبط حساب المسؤول الوحيد المستخدم في صفحة تسجيل الدخول العامة.",v2_first_name:"الاسم الشخصي",v2_last_name:"اسم العائلة",v2_new_password:"كلمة المرور الجديدة",v2_confirmation:"التأكيد",v2_save_identity:"حفظ هوية V2",v2_job_title:"الوظيفة",v2_department:"القسم",v2_email:"البريد الإلكتروني",v2_phone:"الهاتف",v2_hire_date:"تاريخ الالتحاق",v2_language:"اللغة",v2_password:"كلمة المرور",v2_cancel:"إلغاء",v2_save:"حفظ",
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
    document.querySelectorAll("[data-adm-i18n-aria]").forEach((node) => {
      const value = messages[lang][node.dataset.admI18nAria];
      if (value) node.setAttribute("aria-label", value);
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
