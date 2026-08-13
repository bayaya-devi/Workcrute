(() => {
  const I = window.workcruteCandidateI18n,
    { t } = I,
    root = location.pathname.startsWith("/Workcrute/") ? "/Workcrute" : "";
  const href = (path) => root + path,
    api = (path, options) => window.workcrute.api(path, options),
    escape = (value) =>
      String(value ?? "").replace(
        /[&<>'"]/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[char],
      );
  const parse = (value, fallback) => {
    try {
      return typeof value === "string"
        ? JSON.parse(value)
        : (value ?? fallback);
    } catch {
      return fallback;
    }
  };
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat(I.getLanguage(), {
          dateStyle: "medium",
        }).format(new Date(value))
      : t("empty");
  const dateTime = (value) =>
    value
      ? new Intl.DateTimeFormat(I.getLanguage(), {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : t("empty");
  const path = location.pathname.replace(root, "").replace(/\/$/, "") || "/";
  const routes = {
    dashboard: "/demandeur/tableau-de-bord",
    jobs: "/demandeur/offres",
    saved: "/demandeur/offres-enregistrees",
    alerts: "/demandeur/alertes",
    applications: "/demandeur/candidatures",
    documents: "/demandeur/documents",
    interviews: "/demandeur/entretiens",
    profile: "/demandeur/profil",
    notifications: "/demandeur/notifications",
    settings: "/demandeur/parametres",
    security: "/demandeur/securite",
  };
  const nav = [
    ["dashboard", "⌂"],
    ["jobs", "⌕"],
    ["applications", "▤"],
    ["alerts", "◉"],
    ["saved", "♡"],
    ["documents", "▱"],
    ["interviews", "▣"],
    ["profile", "♙"],
    ["notifications", "◌"],
    ["settings", "⚙"],
  ];
  const current = (key) =>
    path === routes[key] || path.startsWith(routes[key] + "/");
  const navLink = ([key, icon]) =>
    `<a href="${href(routes[key])}" ${current(key) ? 'aria-current="page"' : ""}><span class="cand-nav-icon" aria-hidden="true">${icon}</span><span>${t(key)}</span></a>`;
  function shell() {
    document.body.className = "candidate-body";
    document.body.innerHTML = `<a class="wc-skip-link" href="#candidate-content">${t("viewAll")}</a><div class="cand-shell"><aside class="cand-sidebar" id="cand-sidebar" aria-label="${t("menu")}"><a class="cand-brand" href="${href(routes.dashboard)}"><span class="cand-brand-mark">W</span><span>Workcrute</span></a><nav class="cand-nav">${nav.map(navLink).join("")}</nav><div class="cand-sidebar-foot"><button class="cand-logout" data-logout-candidate><span class="cand-nav-icon">↪</span>${t("logout")}</button></div></aside><div class="cand-main"><header class="cand-topbar"><div class="cand-mobile-head"><button class="cand-icon-btn" data-menu aria-label="${t("menu")}" aria-expanded="false">☰</button><a class="cand-brand-mark" href="${href(routes.dashboard)}">W</a></div><div class="cand-top-actions"><select class="cand-select" data-language aria-label="${t("language")}"><option value="fr">FR</option><option value="en">EN</option><option value="ar">AR</option></select><a class="cand-icon-btn" href="${href(routes.notifications)}" aria-label="${t("notifications")}">♢<span class="cand-badge" data-notification-count hidden>0</span></a><a class="cand-user" href="${href(routes.profile)}"><span class="cand-avatar" data-avatar>?</span><span class="cand-user-copy"><strong data-user-name>—</strong><small data-user-email>—</small></span></a></div></header><main class="cand-content" id="candidate-content"><div class="cand-loading" role="status"><div><div class="cand-skeleton"></div><div class="cand-skeleton"></div><p>${t("loading")}</p></div></div></main></div><nav class="cand-bottom-nav" aria-label="${t("menu")}">${[
      ["dashboard", "⌂"],
      ["jobs", "⌕"],
      ["applications", "▤"],
      ["interviews", "▣"],
    ]
      .map(navLink)
      .join(
        "",
      )}<button data-menu><span class="cand-nav-icon">☰</span><span>${t("menu")}</span></button></nav></div>`;
    bindShell();
  }
  function bindShell() {
    const sidebar = document.querySelector(".cand-sidebar");
    document.querySelectorAll("[data-menu]").forEach((button) =>
      button.addEventListener("click", () => {
        const open = !sidebar.classList.contains("is-open");
        sidebar.classList.toggle("is-open", open);
        button.setAttribute("aria-expanded", String(open));
        document.querySelector(".cand-overlay")?.remove();
        if (open) {
          const overlay = document.createElement("button");
          overlay.className = "cand-overlay";
          overlay.setAttribute("aria-label", t("menu"));
          overlay.addEventListener("click", () => {
            sidebar.classList.remove("is-open");
            overlay.remove();
          });
          document.body.append(overlay);
        }
      }),
    );
    const lang = document.querySelector("[data-language]");
    lang.value = I.getLanguage();
    lang.addEventListener("change", () => I.setLanguage(lang.value));
    document
      .querySelector("[data-logout-candidate]")
      .addEventListener("click", logout);
  }
  function page(title, subtitle = "", action = "") {
    return `<div class="cand-page-head"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${action}</div>`;
  }
  function empty(title, help, action = "") {
    return `<div class="cand-empty"><div><strong>${title}</strong><p>${help}</p>${action}</div></div>`;
  }
  function errorState() {
    return `<div class="cand-error" role="alert"><div><strong>${t("error")}</strong><p>${t("noJobsHelp")}</p><button class="wc-button wc-button--secondary" onclick="location.reload()">${t("retry")}</button></div></div>`;
  }
  function toast(message, isError = false) {
    document.querySelector(".cand-toast")?.remove();
    const node = document.createElement("div");
    node.className = "cand-toast" + (isError ? " is-error" : "");
    node.setAttribute("role", isError ? "alert" : "status");
    node.textContent = message;
    document.body.append(node);
    setTimeout(() => node.remove(), 3500);
  }
  function busy(button, state, label = t("loading")) {
    if (!button) return;
    button.disabled = state;
    if (state) {
      button.dataset.idle = button.textContent;
      button.textContent = label;
    } else if (button.dataset.idle) button.textContent = button.dataset.idle;
  }
  const statusLabel = (value) =>
    t(
      {
        submitted: "submitted",
        reviewing: "reviewing",
        shortlisted: "shortlisted",
        interview: "interview",
        accepted: "accepted",
        rejected: "rejected",
        withdrawn: "withdrawn",
      }[value] || value,
    );
  const statusClass = (value) =>
    ["accepted", "confirmed", "completed"].includes(value)
      ? "success"
      : ["rejected", "withdrawn", "declined", "cancelled"].includes(value)
        ? "danger"
        : ["shortlisted", "interview", "scheduled"].includes(value)
          ? "warning"
          : "info";
  function jobCard(job) {
    return `<article class="cand-card cand-job"><div><div class="cand-meta"><span>${escape(job.company_name || t("empty"))}</span><span>${escape(job.city || t("empty"))}</span><span>${escape(job.contract_type || t("empty"))}</span></div><h2><a href="${href(routes.jobs + `/detail/?id=${encodeURIComponent(job.id)}`)}">${escape(job.title)}</a></h2><p>${escape(job.description || "")}</p><div class="cand-meta"><span class="cand-pill">${escape(job.domain || "")}</span><span class="cand-pill">${escape(job.work_mode || "")}</span></div></div><div class="cand-actions"><button class="wc-button wc-button--secondary" data-save-job="${escape(job.id)}" aria-pressed="${Boolean(job.is_saved)}">${job.is_saved ? t("savedAction") : t("save")}</button><a class="wc-button wc-button--primary" href="${href(routes.jobs + `/detail/?id=${encodeURIComponent(job.id)}`)}">${t("viewAll")}</a></div></article>`;
  }
  async function userHeader() {
    const data = await api("/api/auth/me");
    if (data.user.role !== "candidate")
      throw new Error("Accès candidat requis.");
    const name = [data.profile?.first_name, data.profile?.last_name]
      .filter(Boolean)
      .join(" ");
    document.querySelector("[data-user-name]").textContent =
      name || data.user.email;
    document.querySelector("[data-user-email]").textContent = data.user.email;
    document.querySelector("[data-avatar]").textContent = (
      data.profile?.first_name?.[0] || data.user.email[0]
    ).toUpperCase();
    return data;
  }
  async function notificationCount() {
    try {
      const data = await api("/api/notifications"),
        items = data.items || data.notifications || data || [],
        count = items.filter((item) => !item.read_at && !item.is_read).length,
        badge = document.querySelector("[data-notification-count]");
      badge.textContent = count;
      badge.hidden = !count;
    } catch {}
  }
  function completion(profile, docs = []) {
    const fields = [
        ["professional_title", "job"],
        ["introduction", "summary"],
        ["city", "city"],
        ["availability", "availability"],
        ["skills_json", "skills"],
        ["experience_json", "experience"],
        ["education_json", "education"],
        ["languages_json", "languages"],
      ],
      missing = fields
        .filter(([field]) => {
          const value = profile?.[field];
          return !value || value === "[]" || value === "{}";
        })
        .map(([, key]) => t(key));
    if (!docs.some((doc) => doc.kind === "cv")) missing.push(t("cv"));
    return {
      score: Math.round(
        ((fields.length + 1 - missing.length) / (fields.length + 1)) * 100,
      ),
      missing,
    };
  }
  async function dashboard() {
    const main = document.querySelector("main");
    try {
      const [data, docsData] = await Promise.all([
          api("/api/candidate/overview"),
          api("/api/documents"),
        ]),
        docs = docsData.items || docsData.documents || docsData || [],
        done = completion(data.profile, docs),
        first = escape(data.profile?.first_name || "");
      main.innerHTML =
        page(
          `${t("hello")} ${first}`,
          t("welcome"),
          `<a class="wc-button wc-button--primary" href="${href(routes.jobs)}">${t("findJobs")}</a>`,
        ) +
        `<section class="cand-grid cand-grid--stats" aria-label="${t("dashboard")}">${[
          ["◫", data.stats.applicationsSent, t("sent")],
          ["◷", data.stats.applicationsActive, t("active")],
          ["▣", data.stats.interviews, t("interviews")],
          ["◉", data.stats.recruiterViews, t("profileViews")],
        ]
          .map(
            ([icon, value, label]) =>
              `<div class="cand-card cand-stat"><span class="cand-stat-icon">${icon}</span><div><strong>${value || 0}</strong><span>${label}</span></div></div>`,
          )
          .join(
            "",
          )}</section><div class="cand-grid cand-grid--2" style="margin-top:20px"><section class="cand-card"><div class="cand-card-head"><h2>${t("completion")}</h2><strong>${done.score}%</strong></div><div class="cand-progress" role="progressbar" aria-valuenow="${done.score}" aria-valuemin="0" aria-valuemax="100"><i style="width:${done.score}%"></i></div>${done.missing.length ? `<h3 style="margin-top:18px">${t("missing")}</h3><ul class="cand-checklist">${done.missing.map((item) => `<li>${item}</li>`).join("")}</ul><a class="wc-button wc-button--primary" style="margin-top:18px" href="${href(routes.profile + "/modifier/")}">${t("completeProfile")}</a>` : ""}</section><section class="cand-card"><div class="cand-card-head"><h2>${t("upcoming")}</h2><a href="${href(routes.interviews)}">${t("viewAll")}</a></div>${data.interviews.length ? data.interviews.map((interview) => `<div class="cand-item"><div><h3>${escape(interview.title)}</h3><div class="cand-meta"><span>${escape(interview.company_name || "")}</span><span>${dateTime(interview.starts_at)}</span></div></div></div>`).join("") : empty(t("noInterviews"), t("noInterviewsHelp"))}</section></div><section style="margin-top:20px"><div class="cand-card-head"><h2>${t("recommended")}</h2><span class="cand-pill">${t("matchingUnavailable")}</span></div><p class="cand-status">${t("matchingHelp")}</p><div class="cand-grid cand-grid--cards">${data.recommendedJobs.length ? data.recommendedJobs.map(jobCard).join("") : empty(t("noJobs"), t("noJobsHelp"))}</div></section><div class="cand-grid cand-grid--2" style="margin-top:20px"><section class="cand-card"><div class="cand-card-head"><h2>${t("latestNotifications")}</h2><a href="${href(routes.notifications)}">${t("viewAll")}</a></div>${data.notifications.length ? data.notifications.map((note) => `<div class="cand-item"><div><h3>${escape(note.title)}</h3><p class="cand-status">${escape(note.body)}</p></div><small>${date(note.created_at)}</small></div>`).join("") : empty(t("noNotifications"), t("noNotificationsHelp"))}</section><section class="cand-card"><div class="cand-card-head"><h2>${t("recentActivity")}</h2></div>${data.applications.length ? data.applications.map((item) => `<div class="cand-item"><div><h3>${t("applicationActivity")}</h3><div class="cand-meta"><span>${escape(item.title)}</span><span>${date(item.created_at)}</span></div></div><span class="cand-pill cand-pill--${statusClass(item.status)}">${statusLabel(item.status)}</span></div>`).join("") : empty(t("empty"), t("noApplicationsHelp"))}</section></div>`;
      bindSaveJobs();
    } catch (error) {
      console.error(error);
      main.innerHTML = page(t("dashboard")) + errorState();
    }
  }
  async function jobs(savedOnly = false) {
    const main = document.querySelector("main");
    main.innerHTML =
      page(
        t(savedOnly ? "saved" : "jobs"),
        t(savedOnly ? "noSavedHelp" : "searchJobs"),
      ) +
      (!savedOnly
        ? `<form class="cand-toolbar" data-search-form><input class="cand-input" name="q" placeholder="${t("keyword")}"><input class="cand-input" name="city" placeholder="${t("city")}"><input class="cand-input" name="domain" placeholder="${t("domain")}"><select class="cand-select" name="contract"><option value="">${t("contract")}</option><option>CDI</option><option>CDD</option><option>Stage</option><option>Freelance</option></select><button class="wc-button wc-button--primary">${t("search")}</button></form>`
        : "") +
      `<div class="cand-grid" data-job-list><div class="cand-loading">${t("loading")}</div></div>`;
    const load = async (form) => {
      const list = document.querySelector("[data-job-list]");
      try {
        const query = form ? "?" + new URLSearchParams(new FormData(form)) : "",
          data = await api(savedOnly ? "/api/saved-jobs" : "/api/jobs" + query),
          items = data.items || [];
        list.innerHTML = items.length
          ? items.map(jobCard).join("")
          : empty(
              t(savedOnly ? "noSaved" : "noJobs"),
              t(savedOnly ? "noSavedHelp" : "noJobsHelp"),
              !savedOnly
                ? ""
                : `<a class="wc-button wc-button--primary" href="${href(routes.jobs)}">${t("findJobs")}</a>`,
            );
        bindSaveJobs();
      } catch {
        list.innerHTML = errorState();
      }
    };
    document
      .querySelector("[data-search-form]")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        load(event.currentTarget);
      });
    load();
  }
  function bindSaveJobs() {
    document.querySelectorAll("[data-save-job]").forEach((button) =>
      button.addEventListener("click", async () => {
        if (button.disabled) return;
        busy(button, true);
        try {
          const saved = button.getAttribute("aria-pressed") === "true";
          await api(`/api/saved-jobs/${button.dataset.saveJob}`, {
            method: saved ? "DELETE" : "POST",
          });
          button.setAttribute("aria-pressed", String(!saved));
          button.textContent = saved ? t("save") : t("savedAction");
          if (path === routes.saved && saved)
            button.closest("article")?.remove();
        } catch (error) {
          toast(error.message, true);
        } finally {
          button.disabled = false;
        }
      }),
    );
  }
  function applicationQuestions(questionnaire, documents = []) {
    if (!questionnaire?.questions?.length) return "";
    const language = I.getLanguage();
    return `<section class="cand-form-section"><h3>${escape(questionnaire.name)}</h3>${questionnaire.questions
      .map((question) => {
        const label = question.labels?.[language] || question.labels?.fr || "",
          help = question.help?.[language] || question.help?.fr || "",
          placeholder = question.placeholder?.[language] || question.placeholder?.fr || "",
          required = question.is_required ? "required" : "",
          common = `class="cand-input" data-question-id="${question.id}" name="question_${question.id}" ${required}`;
        let input;
        if (question.question_type === "long_text") input = `<textarea ${common} placeholder="${escape(placeholder)}"></textarea>`;
        else if (question.question_type === "boolean") input = `<select ${common}><option value=""></option><option value="true">${language === "ar" ? "نعم" : language === "en" ? "Yes" : "Oui"}</option><option value="false">${language === "ar" ? "لا" : language === "en" ? "No" : "Non"}</option></select>`;
        else if (["single_choice", "multiple_choice"].includes(question.question_type)) {
          const options = (question.options || []).map((option) => `<option value="${escape(option.id)}">${escape(option[language] || option.fr)}</option>`).join("");
          input = question.question_type === "multiple_choice" ? `<select ${common} multiple>${options}</select>` : `<select ${common}><option value=""></option>${options}</select>`;
        } else if (question.question_type === "upload") {
          input = `<select ${common}><option value=""></option>${documents.map((doc) => `<option value="${escape(doc.id)}">${escape(doc.original_name)}</option>`).join("")}</select>`;
        } else {
          const type = question.question_type === "number" || question.question_type === "rating" ? "number" : question.question_type === "date" ? "date" : "text";
          input = `<input ${common} type="${type}" placeholder="${escape(placeholder)}" ${question.question_type === "rating" ? 'min="1" max="5"' : ""}>`;
        }
        return `<div class="cand-field" data-question-wrap="${question.id}" data-condition="${escape(JSON.stringify(question.condition || {}))}"><label>${escape(label)}${question.is_required ? " *" : ""}</label>${input}${help ? `<small>${escape(help)}</small>` : ""}</div>`;
      })
      .join("")}</section>`;
  }
  async function jobDetail() {
    const main = document.querySelector("main"),
      id = new URLSearchParams(location.search).get("id");
    if (!id) {
      main.innerHTML = errorState();
      return;
    }
    try {
      const [{ job, matchingScore, questionnaire }, documentData] = await Promise.all([
        api(`/api/jobs/${encodeURIComponent(id)}`),
        api("/api/documents").catch(() => ({ items: [] })),
      ]);
      const candidateDocuments = documentData.items || documentData.documents || [];
      main.innerHTML =
        page(
          t("jobDetails"),
          `${escape(job.company_name || "")} · ${escape(job.city || "")}`,
          `<a class="wc-button wc-button--secondary" href="${href(routes.jobs)}">${t("backJobs")}</a>`,
        ) +
        `<div class="cand-grid cand-grid--2"><article class="cand-card"><div class="cand-meta"><span class="cand-pill">${escape(job.contract_type)}</span><span class="cand-pill">${escape(job.work_mode)}</span><span class="cand-pill">${escape(job.domain)}</span></div><h2 style="margin-top:16px">${escape(job.title)}</h2><h3>${t("description")}</h3><p>${escape(job.description)}</p>${job.missions ? `<h3>${t("missions")}</h3><p>${escape(job.missions)}</p>` : ""}${
          parse(job.required_skills, []).length
            ? `<h3>${t("skillsLabel")}</h3><div class="cand-actions">${parse(
                job.required_skills,
                [],
              )
                .map(
                  (skill) => `<span class="cand-pill">${escape(skill)}</span>`,
                )
                .join("")}</div>`
            : ""
        }</article><aside class="cand-card"><h2>${t("apply")}</h2><p class="cand-status">${matchingScore == null ? t("matchingHelp") : matchingScore + "%"}</p><form class="cand-form" data-apply><div class="cand-field"><label for="cover">${t("coverLetter")}</label><textarea class="cand-textarea" id="cover" name="coverLetter" maxlength="3000"></textarea></div>${applicationQuestions(questionnaire, candidateDocuments)}<p class="cand-status" data-status></p><button class="wc-button wc-button--primary">${t("apply")}</button></form><button class="wc-button wc-button--secondary" style="margin-top:10px;width:100%" data-save-job="${escape(job.id)}" aria-pressed="${Boolean(job.is_saved)}">${job.is_saved ? t("savedAction") : t("save")}</button></aside></div>`;
      bindSaveJobs();
      const applyForm = document.querySelector("[data-apply]");
      const updateConditions = () => applyForm.querySelectorAll("[data-question-wrap]").forEach((wrap) => {
        const condition = JSON.parse(wrap.dataset.condition || "{}"), source = condition.questionId && applyForm.querySelector(`[data-question-id="${condition.questionId}"]`);
        if (!source) { wrap.hidden = false; return; }
        const sourceValue = source.multiple ? [...source.selectedOptions].map((option) => option.value) : source.value;
        const equals = Array.isArray(sourceValue) ? sourceValue.includes(String(condition.value)) : String(sourceValue) === String(condition.value),
          matches = condition.operator === "not_equals" ? !equals : condition.operator === "contains" ? (Array.isArray(sourceValue) ? sourceValue.includes(String(condition.value)) : String(sourceValue).includes(String(condition.value))) : condition.operator === "in" ? (Array.isArray(condition.value) ? condition.value : [condition.value]).map(String).includes(String(sourceValue)) : equals;
        wrap.hidden = !matches;
        wrap.querySelector("[data-question-id]").disabled = wrap.hidden;
      });
      applyForm.addEventListener("change", updateConditions);
      updateConditions();
      document
        .querySelector("[data-apply]")
        .addEventListener("submit", async (event) => {
          event.preventDefault();
          const button = event.currentTarget.querySelector("button"),
            status = event.currentTarget.querySelector("[data-status]");
          if (button.disabled) return;
          busy(button, true);
          status.textContent = "";
          try {
            const questionnaireAnswers = {};
            event.currentTarget.querySelectorAll("[data-question-id]:not(:disabled)").forEach((field) => {
              questionnaireAnswers[field.dataset.questionId] = field.multiple ? [...field.selectedOptions].map((option) => option.value) : field.type === "number" ? Number(field.value) : field.value === "true" ? true : field.value === "false" ? false : field.value;
            });
            await api("/api/applications", {
              method: "POST",
              body: JSON.stringify({
                jobId: id,
                coverLetter: new FormData(event.currentTarget).get(
                  "coverLetter",
                ),
                questionnaireAnswers,
              }),
            });
            status.className = "cand-status is-success";
            status.textContent = t("applicationSent");
            button.disabled = true;
          } catch (error) {
            status.className = "cand-status is-error";
            status.textContent = error.message;
            busy(button, false);
          }
        });
    } catch {
      main.innerHTML = page(t("jobDetails")) + errorState();
    }
  }
  async function alerts() {
    const main = document.querySelector("main");
    main.innerHTML =
      page(
        t("alerts"),
        t("noAlertsHelp"),
        `<button class="wc-button wc-button--primary" data-show-alert>${t("createAlert")}</button>`,
      ) +
      `<section class="cand-card" data-alert-form-wrap hidden><form class="cand-form" data-alert-form><div class="cand-form-grid"><div class="cand-field"><label>${t("alertName")}</label><input class="cand-input" name="name" maxlength="120"></div><div class="cand-field"><label>${t("job")}</label><input class="cand-input" name="keywords" maxlength="160"></div><div class="cand-field"><label>${t("domain")}</label><input class="cand-input" name="domain" maxlength="120"></div><div class="cand-field"><label>${t("city")}</label><input class="cand-input" name="city" maxlength="120"></div><div class="cand-field"><label>${t("contract")}</label><input class="cand-input" name="contractType" maxlength="80"></div><div class="cand-field"><label>${t("skills")}</label><input class="cand-input" name="skills" placeholder="${t("commaSeparated")}"></div><div class="cand-field"><label>${t("frequency")}</label><select class="cand-select" name="frequency"><option value="immediate">${t("immediateFreq")}</option><option value="daily">${t("daily")}</option><option value="weekly">${t("weekly")}</option></select></div></div><p class="cand-status" data-status></p><button class="wc-button wc-button--primary">${t("createAlert")}</button></form></section><div class="cand-grid" style="margin-top:20px" data-alert-list><div class="cand-loading">${t("loading")}</div></div>`;
    const wrap = document.querySelector("[data-alert-form-wrap]");
    document
      .querySelector("[data-show-alert]")
      .addEventListener("click", () => {
        wrap.hidden = !wrap.hidden;
        if (!wrap.hidden) wrap.querySelector("input")?.focus();
      });
    const load = async () => {
      const list = document.querySelector("[data-alert-list]");
      try {
        const data = await api("/api/job-alerts"),
          items = data.items || [];
        list.innerHTML = items.length
          ? items
              .map(
                (alert) =>
                  `<article class="cand-card cand-item"><div><h2>${escape(alert.name || alert.keywords || t("alerts"))}</h2><div class="cand-meta"><span>${escape(alert.domain || t("all"))}</span><span>${escape(alert.city || t("all"))}</span><span>${escape(alert.contract_type || t("all"))}</span><span>${t(alert.frequency === "immediate" ? "immediateFreq" : alert.frequency)}</span></div></div><div class="cand-actions"><button class="cand-tab ${alert.is_active ? "is-active" : ""}" data-toggle-alert="${alert.id}" aria-pressed="${Boolean(alert.is_active)}">${t(alert.is_active ? "enabled" : "disabled")}</button><button class="wc-button wc-button--secondary" data-delete-alert="${alert.id}">${t("delete")}</button></div></article>`,
              )
              .join("")
          : empty(t("noAlerts"), t("noAlertsHelp"));
        bindAlerts();
      } catch {
        list.innerHTML = errorState();
      }
    };
    function bindAlerts() {
      document.querySelectorAll("[data-toggle-alert]").forEach((button) =>
        button.addEventListener("click", async () => {
          const active = button.getAttribute("aria-pressed") === "true";
          await api(`/api/job-alerts/${button.dataset.toggleAlert}`, {
            method: "PATCH",
            body: JSON.stringify({ active: !active }),
          });
          load();
        }),
      );
      document.querySelectorAll("[data-delete-alert]").forEach((button) =>
        button.addEventListener("click", async () => {
          if (!confirm(t("deleteConfirm"))) return;
          await api(`/api/job-alerts/${button.dataset.deleteAlert}`, {
            method: "DELETE",
          });
          load();
        }),
      );
    }
    const form = document.querySelector("[data-alert-form]");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button"),
        status = form.querySelector("[data-status]"),
        data = Object.fromEntries(new FormData(form));
      data.skills = data.skills
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (button.disabled) return;
      busy(button, true);
      try {
        await api("/api/job-alerts", {
          method: "POST",
          body: JSON.stringify(data),
        });
        form.reset();
        wrap.hidden = true;
        toast(t("alertCreated"));
        await load();
      } catch (error) {
        status.className = "cand-status is-error";
        status.textContent = error.message;
      } finally {
        busy(button, false);
      }
    });
    load();
  }
  async function applications() {
    const main = document.querySelector("main");
    main.innerHTML =
      page(t("applications"), t("noApplicationsHelp")) +
      `<div class="cand-tabs" data-app-tabs>${["all", "submitted", "reviewing", "shortlisted", "interview", "accepted", "rejected", "withdrawn"].map((key, index) => `<button class="cand-tab ${index === 0 ? "is-active" : ""}" data-status-filter="${key}">${t(key)}</button>`).join("")}</div><div class="cand-grid" data-app-list><div class="cand-loading">${t("loading")}</div></div>`;
    try {
      const data = await api("/api/applications"),
        items = data.items || [],
        render = (filter) => {
          const shown =
              filter === "all"
                ? items
                : items.filter((item) => item.status === filter),
            list = document.querySelector("[data-app-list]");
          list.innerHTML = shown.length
            ? shown
                .map(
                  (item) =>
                    `<article class="cand-card cand-item"><div><h2>${escape(item.title)}</h2><div class="cand-meta"><span>${escape(item.company_name || "")}</span><span>${escape(item.city || "")}</span><span>${date(item.created_at)}</span></div></div><div class="cand-actions"><span class="cand-pill cand-pill--${statusClass(item.status)}">${statusLabel(item.status)}</span><a class="wc-button wc-button--secondary" href="${href(routes.applications + `/detail/?id=${item.id}`)}">${t("viewAll")}</a></div></article>`,
                )
                .join("")
            : empty(t("noApplications"), t("noApplicationsHelp"));
        };
      render("all");
      document.querySelectorAll("[data-status-filter]").forEach((button) =>
        button.addEventListener("click", () => {
          document
            .querySelectorAll("[data-status-filter]")
            .forEach((x) => x.classList.remove("is-active"));
          button.classList.add("is-active");
          render(button.dataset.statusFilter);
        }),
      );
    } catch {
      document.querySelector("[data-app-list]").innerHTML = errorState();
    }
  }
  async function applicationDetail() {
    const main = document.querySelector("main"),
      id = new URLSearchParams(location.search).get("id");
    try {
      const data = await api(`/api/applications/${id}`),
        app = data.application;
      main.innerHTML =
        page(
          t("applicationDetails"),
          `${escape(app.company_name || "")} · ${date(app.created_at)}`,
          `<a class="wc-button wc-button--secondary" href="${href(routes.applications)}">${t("applications")}</a>`,
        ) +
        `<div class="cand-grid cand-grid--2"><article class="cand-card"><div class="cand-card-head"><h2>${escape(app.title)}</h2><span class="cand-pill cand-pill--${statusClass(app.status)}">${statusLabel(app.status)}</span></div><dl class="cand-detail-list"><div class="cand-detail"><dt>${t("city")}</dt><dd>${escape(app.city || t("empty"))}</dd></div><div class="cand-detail"><dt>${t("contract")}</dt><dd>${escape(app.contract_type || t("empty"))}</dd></div><div class="cand-detail"><dt>${t("status")}</dt><dd>${statusLabel(app.status)}</dd></div><div class="cand-detail"><dt>${t("date")}</dt><dd>${date(app.created_at)}</dd></div></dl>${app.cover_letter ? `<h3 style="margin-top:20px">${t("coverLetter")}</h3><p>${escape(app.cover_letter)}</p>` : ""}${!["accepted", "rejected", "withdrawn"].includes(app.status) ? `<button class="wc-button wc-button--secondary" style="margin-top:20px" data-withdraw>${t("withdraw")}</button>` : ""}</article><aside class="cand-card"><h2>${t("timeline")}</h2><ol class="cand-timeline" style="margin-top:22px">${data.timeline.map((step) => `<li><strong>${statusLabel(step.status)}</strong><div class="cand-meta">${dateTime(step.created_at)}</div></li>`).join("")}</ol></aside></div>`;
      document
        .querySelector("[data-withdraw]")
        ?.addEventListener("click", async (event) => {
          if (!confirm(t("withdraw"))) return;
          busy(event.currentTarget, true);
          try {
            await api(`/api/applications/${id}`, {
              method: "PATCH",
              body: "{}",
            });
            location.reload();
          } catch (error) {
            toast(error.message, true);
            busy(event.currentTarget, false);
          }
        });
    } catch {
      main.innerHTML = page(t("applicationDetails")) + errorState();
    }
  }
  async function documents() {
    const main = document.querySelector("main");
    main.innerHTML =
      page(
        t("documents"),
        t("uploadRules"),
        `<button class="wc-button wc-button--primary" data-show-upload>${t("addDocument")}</button>`,
      ) +
      `<section class="cand-card" data-upload-wrap hidden><form class="cand-form" data-upload enctype="multipart/form-data"><div class="cand-form-grid"><div class="cand-field"><label>${t("documentType")}</label><select class="cand-select" name="kind">${[
        ["cv", "cv"],
        ["cover_letter", "letter"],
        ["diploma", "diploma"],
        ["certificate", "certificate"],
        ["portfolio", "portfolio"],
        ["other", "other"],
      ]
        .map(([value, key]) => `<option value="${value}">${t(key)}</option>`)
        .join(
          "",
        )}</select></div><div class="cand-field"><label>${t("documents")}</label><input class="cand-input" type="file" name="file" accept=".pdf,.doc,.docx" required></div></div><p class="cand-status" data-status>${t("uploadRules")}</p><button class="wc-button wc-button--primary">${t("upload")}</button></form></section><div class="cand-grid cand-grid--cards" style="margin-top:20px" data-doc-list><div class="cand-loading">${t("loading")}</div></div>`;
    const wrap = document.querySelector("[data-upload-wrap]");
    document
      .querySelector("[data-show-upload]")
      .addEventListener("click", () => {
        wrap.hidden = !wrap.hidden;
      });
    const load = async () => {
      const list = document.querySelector("[data-doc-list]");
      try {
        const data = await api("/api/documents"),
          items = data.items || data.documents || data || [];
        list.innerHTML = items.length
          ? items
              .map(
                (doc) =>
                  `<article class="cand-card"><div class="cand-card-head"><span class="cand-stat-icon">▱</span>${doc.is_default ? `<span class="cand-pill cand-pill--success">${t("primary")}</span>` : ""}</div><h2>${escape(doc.original_name)}</h2><div class="cand-meta"><span>${t(doc.kind === "cover_letter" ? "letter" : doc.kind)}</span><span>${Math.max(1, Math.round((doc.size_bytes || 0) / 1024))} Ko</span><span>${date(doc.created_at)}</span></div><div class="cand-actions" style="margin-top:18px"><a class="wc-button wc-button--secondary" href="${doc.download_url || `/api/documents/${doc.id}/download`}">${t("download")}</a>${doc.kind === "cv" && !doc.is_default ? `<button class="wc-button wc-button--secondary" data-primary="${doc.id}">${t("makePrimary")}</button>` : ""}<button class="wc-button wc-button--secondary" data-delete-doc="${doc.id}">${t("delete")}</button></div></article>`,
              )
              .join("")
          : empty(t("noDocuments"), t("noDocumentsHelp"));
        bindDocs();
      } catch {
        list.innerHTML = errorState();
      }
    };
    function bindDocs() {
      document.querySelectorAll("[data-primary]").forEach((button) =>
        button.addEventListener("click", async () => {
          await api(`/api/documents/${button.dataset.primary}/default`, {
            method: "PATCH",
            body: "{}",
          });
          load();
        }),
      );
      document.querySelectorAll("[data-delete-doc]").forEach((button) =>
        button.addEventListener("click", async () => {
          if (!confirm(t("deleteConfirm"))) return;
          await api(`/api/documents/${button.dataset.deleteDoc}`, {
            method: "DELETE",
          });
          load();
        }),
      );
    }
    document
      .querySelector("[data-upload]")
      .addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget,
          file = form.elements.file.files[0],
          status = form.querySelector("[data-status]"),
          button = form.querySelector("button");
        if (!file) return;
        if (file.size > 8 * 1024 * 1024 || !/\.(pdf|docx?)$/i.test(file.name)) {
          status.className = "cand-status is-error";
          status.textContent = t("uploadRules");
          return;
        }
        if (button.disabled) return;
        busy(button, true);
        try {
          const data = new FormData(form);
          if (location.hostname.endsWith("github.io"))
            await window.workcruteLocalApi.uploadDocument(data);
          else {
            const response = await fetch("/api/documents", {
              method: "POST",
              credentials: "same-origin",
              body: data,
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || t("error"));
          }
          form.reset();
          wrap.hidden = true;
          toast(t("documentAdded"));
          load();
        } catch (error) {
          status.className = "cand-status is-error";
          status.textContent = error.message;
        } finally {
          busy(button, false);
        }
      });
    load();
  }
  async function interviews() {
    const main = document.querySelector("main");
    main.innerHTML =
      page(t("interviews"), t("noInterviewsHelp")) +
      `<div class="cand-tabs">${[
        ["upcoming", t("upcomingTab")],
        ["past", t("past")],
        ["cancelled", t("cancelled")],
      ]
        .map(
          ([key, label], index) =>
            `<button class="cand-tab ${index === 0 ? "is-active" : ""}" data-interview-tab="${key}">${label}</button>`,
        )
        .join(
          "",
        )}</div><div class="cand-grid" data-interview-list><div class="cand-loading">${t("loading")}</div></div>`;
    try {
      const { items = [] } = await api("/api/interviews"),
        render = (filter) => {
          const currentTime = new Date(),
            shown = items.filter((item) =>
              filter === "cancelled"
                ? item.status === "cancelled"
                : filter === "past"
                  ? new Date(item.starts_at) < currentTime &&
                    item.status !== "cancelled"
                  : new Date(item.starts_at) >= currentTime &&
                    item.status !== "cancelled",
            );
          document.querySelector("[data-interview-list]").innerHTML =
            shown.length
              ? shown
                  .map(
                    (item) =>
                      `<article class="cand-card"><div class="cand-card-head"><div><h2>${escape(item.title)}</h2><div class="cand-meta"><span>${escape(item.company_name || "")}</span></div></div><span class="cand-pill cand-pill--${statusClass(item.status)}">${escape(item.status)}</span></div><dl class="cand-detail-list"><div class="cand-detail"><dt>${t("date")}</dt><dd>${date(item.starts_at)}</dd></div><div class="cand-detail"><dt>${t("time")}</dt><dd>${new Intl.DateTimeFormat(I.getLanguage(), { timeStyle: "short" }).format(new Date(item.starts_at))}</dd></div><div class="cand-detail"><dt>${t("type")}</dt><dd>${escape(item.interview_type)}</dd></div><div class="cand-detail"><dt>${t("location")}</dt><dd>${item.meeting_url ? `<a href="${escape(item.meeting_url)}" target="_blank" rel="noopener">${escape(item.meeting_url)}</a>` : escape(item.location || t("empty"))}</dd></div></dl>${filter === "upcoming" && item.status === "scheduled" ? `<div class="cand-actions" style="margin-top:18px"><button class="wc-button wc-button--primary" data-interview-action="confirmed" data-id="${item.id}">${t("confirm")}</button><button class="wc-button wc-button--secondary" data-interview-action="reschedule_requested" data-id="${item.id}">${t("reschedule")}</button><button class="wc-button wc-button--secondary" data-interview-action="declined" data-id="${item.id}">${t("decline")}</button></div>` : ""}</article>`,
                  )
                  .join("")
              : empty(t("noInterviews"), t("noInterviewsHelp"));
          document
            .querySelectorAll("[data-interview-action]")
            .forEach((button) =>
              button.addEventListener("click", async () => {
                await api(`/api/interviews/${button.dataset.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    status: button.dataset.interviewAction,
                  }),
                });
                location.reload();
              }),
            );
        };
      render("upcoming");
      document.querySelectorAll("[data-interview-tab]").forEach((button) =>
        button.addEventListener("click", () => {
          document
            .querySelectorAll("[data-interview-tab]")
            .forEach((x) => x.classList.remove("is-active"));
          button.classList.add("is-active");
          render(button.dataset.interviewTab);
        }),
      );
    } catch {
      document.querySelector("[data-interview-list]").innerHTML = errorState();
    }
  }
  function field(label, value) {
    return `<div class="cand-detail"><dt>${label}</dt><dd>${value ? escape(value) : t("empty")}</dd></div>`;
  }
  async function profile(edit = false) {
    const main = document.querySelector("main");
    try {
      const data = await api("/api/auth/me"),
        p = data.profile || {},
        skills = parse(p.skills_json, []),
        experience = parse(p.experience_json, []),
        education = parse(p.education_json, []),
        languages = parse(p.languages_json, []),
        preferences = parse(p.preferences_json, {});
      if (!edit) {
        main.innerHTML =
          page(
            t("profile"),
            data.user.email,
            `<a class="wc-button wc-button--primary" href="${href(routes.profile + "/modifier/")}">${t("editProfile")}</a>`,
          ) +
          `<div class="cand-grid cand-grid--2"><section class="cand-card"><div class="cand-card-head"><h2>${t("identity")}</h2></div><dl class="cand-detail-list">${field(t("firstName"), p.first_name)}${field(t("lastName"), p.last_name)}${field(t("phone"), p.phone)}${field(t("city"), p.city)}${field(t("job"), p.professional_title)}${field(t("availability"), p.availability === "other" ? p.availability_details : t({ immediate: "immediately", one_month: "oneMonth", two_months: "twoMonths" }[p.availability] || "empty"))}</dl><h3 style="margin-top:24px">${t("summary")}</h3><p>${escape(p.introduction || t("empty"))}</p></section><aside class="cand-grid"><section class="cand-card"><h2>${t("skills")}</h2><div class="cand-actions" style="margin-top:14px">${skills.length ? skills.map((x) => `<span class="cand-pill">${escape(x)}</span>`).join("") : t("empty")}</div></section><section class="cand-card"><h2>${t("experience")}</h2><p>${experience.length ? experience.map(escape).join(" · ") : t("empty")}</p><h2>${t("education")}</h2><p>${education.length ? education.map(escape).join(" · ") : t("empty")}</p><h2>${t("languages")}</h2><p>${languages.length ? languages.map(escape).join(" · ") : t("empty")}</p><h2>${t("preferences")}</h2><p>${Object.values(preferences).filter(Boolean).map(escape).join(" · ") || t("empty")}</p></section></aside></div>`;
        return;
      }
      main.innerHTML =
        page(
          t("editProfile"),
          t("profile"),
          `<a class="wc-button wc-button--secondary" href="${href(routes.profile)}">${t("profile")}</a>`,
        ) +
        `<form class="cand-form cand-card" data-profile-form><section class="cand-form-section"><h2>${t("identity")}</h2><div class="cand-form-grid"><div class="cand-field"><label>${t("firstName")}</label><input class="cand-input" name="firstName" value="${escape(p.first_name)}" required maxlength="80"></div><div class="cand-field"><label>${t("lastName")}</label><input class="cand-input" name="lastName" value="${escape(p.last_name)}" required maxlength="80"></div><div class="cand-field"><label>${t("phone")}</label><input class="cand-input" name="phone" value="${escape(p.phone)}" required pattern="\\+212[5-7][0-9]{8}"></div><div class="cand-field"><label>${t("professionalTitle")}</label><input class="cand-input" name="professionalTitle" value="${escape(p.professional_title)}" maxlength="120"></div><div class="cand-field"><label>${t("city")}</label><input class="cand-input" name="city" value="${escape(p.city)}"></div><div class="cand-field"><label>${t("region")}</label><input class="cand-input" name="region" value="${escape(p.region)}"></div><div class="cand-field"><label>${t("country")}</label><input class="cand-input" name="country" value="${escape(p.country || "Maroc")}"></div><div class="cand-field"><label>${t("availability")}</label><select class="cand-select" name="availability"><option value="">—</option><option value="immediate">${t("immediately")}</option><option value="one_month">${t("oneMonth")}</option><option value="two_months">${t("twoMonths")}</option><option value="other">${t("other")}</option></select></div><div class="cand-field" data-availability-details hidden><label>${t("availabilityDetails")}</label><input class="cand-input" name="availabilityDetails" value="${escape(p.availability_details)}" maxlength="160"></div></div></section><section class="cand-form-section"><div class="cand-field"><label>${t("summary")}</label><textarea class="cand-textarea" name="introduction" maxlength="1000">${escape(p.introduction)}</textarea></div></section><section class="cand-form-section"><div class="cand-form-grid">${[
          ["skills", skills],
          ["experience", experience],
          ["education", education],
          ["languages", languages],
        ]
          .map(
            ([key, values]) =>
              `<div class="cand-field"><label>${t(key)}</label><input class="cand-input" name="${key}" value="${escape(values.join(", "))}" placeholder="${t("commaSeparated")}"></div>`,
          )
          .join(
            "",
          )}<div class="cand-field"><label>${t("preferences")}</label><input class="cand-input" name="preferences" value="${escape(Object.values(preferences).filter(Boolean).join(", "))}" placeholder="${t("commaSeparated")}"></div></div></section><input type="hidden" name="language" value="${I.getLanguage()}"><p class="cand-status" data-status></p><button class="wc-button wc-button--primary" style="justify-self:start">${t("saveChanges")}</button></form>`;
      const form = document.querySelector("[data-profile-form]"),
        select = form.elements.availability,
        details = form.querySelector("[data-availability-details]");
      select.value = p.availability || "";
      const toggle = () => {
        details.hidden = select.value !== "other";
        details.querySelector("input").required = select.value === "other";
      };
      toggle();
      select.addEventListener("change", toggle);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const button = form.querySelector("button"),
          status = form.querySelector("[data-status]"),
          values = Object.fromEntries(new FormData(form));
        for (const key of ["skills", "experience", "education", "languages"])
          values[key] = values[key]
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
        values.preferences = { keywords: values.preferences };
        if (button.disabled) return;
        busy(button, true);
        try {
          await api("/api/profile", {
            method: "PATCH",
            body: JSON.stringify(values),
          });
          status.className = "cand-status is-success";
          status.textContent = t("profileUpdated");
          toast(t("profileUpdated"));
        } catch (error) {
          status.className = "cand-status is-error";
          status.textContent = error.message;
        } finally {
          busy(button, false);
        }
      });
    } catch {
      main.innerHTML = page(t("profile")) + errorState();
    }
  }
  async function notifications() {
    const main = document.querySelector("main");
    main.innerHTML =
      page(
        t("notifications"),
        t("notificationsHint"),
        `<button class="wc-button wc-button--secondary" data-read-all>${t("markAllRead")}</button>`,
      ) +
      `<section class="cand-card" data-note-list><div class="cand-loading">${t("loading")}</div></section>`;
    const load = async () => {
      try {
        const data = await api("/api/notifications"),
          items = data.items || data.notifications || data || [],
          list = document.querySelector("[data-note-list]");
        list.innerHTML = items.length
          ? items
              .map(
                (note) =>
                  `<article class="cand-item" ${!note.read_at && !note.is_read ? 'style="background:#f8fbff"' : ""}><div><h3>${escape(note.title)}</h3><p class="cand-status">${escape(note.body)}</p><small>${dateTime(note.created_at)}</small></div><div class="cand-actions"><button class="cand-icon-btn" data-toggle-note="${note.id}" data-read="${Boolean(note.read_at || note.is_read)}" aria-label="${t("notifications")}">✓</button><button class="cand-icon-btn" data-delete-note="${note.id}" aria-label="${t("delete")}">×</button></div></article>`,
              )
              .join("")
          : empty(t("noNotifications"), t("noNotificationsHelp"));
        document.querySelectorAll("[data-toggle-note]").forEach((button) =>
          button.addEventListener("click", async () => {
            await api(`/api/notifications/${button.dataset.toggleNote}`, {
              method: "PATCH",
              body: JSON.stringify({ read: button.dataset.read !== "true" }),
            });
            load();
          }),
        );
        document.querySelectorAll("[data-delete-note]").forEach((button) =>
          button.addEventListener("click", async () => {
            await api(`/api/notifications/${button.dataset.deleteNote}`, {
              method: "DELETE",
            });
            load();
          }),
        );
      } catch {
        document.querySelector("[data-note-list]").innerHTML = errorState();
      }
    };
    document
      .querySelector("[data-read-all]")
      .addEventListener("click", async () => {
        await api("/api/notifications", { method: "POST", body: "{}" });
        load();
      });
    load();
  }
  async function settings() {
    const main = document.querySelector("main");
    try {
      const { settings: s } = await api("/api/candidate/settings");
      main.innerHTML =
        page(t("settings"), t("notificationPrefs")) +
        `<form class="cand-form cand-card" data-settings><section class="cand-form-section"><h2>${t("language")}</h2><div class="cand-field" style="max-width:320px"><select class="cand-select" name="language"><option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option></select></div></section><section class="cand-form-section"><h2>${t("privacy")}</h2><label class="cand-switch-row"><span>${t("visibleProfile")}</span><input class="cand-switch" type="checkbox" name="profileVisible" ${s.profileVisible ? "checked" : ""}></label></section><section><h2>${t("notificationPrefs")}</h2>${[
          ["inAppEnabled", "inApp"],
          ["emailEnabled", "email"],
          ["jobAlertsEnabled", "alerts"],
          ["profileViewEnabled", "profileViews"],
        ]
          .map(
            ([name, key]) =>
              `<label class="cand-switch-row"><span>${t(key)}</span><input class="cand-switch" type="checkbox" name="${name}" ${s[name] ? "checked" : ""}></label>`,
          )
          .join(
            "",
          )}</section><p class="cand-status" data-status></p><button class="wc-button wc-button--primary" style="justify-self:start">${t("saveSettings")}</button></form><div class="cand-card" style="margin-top:20px"><h2>${t("security")}</h2><a class="wc-button wc-button--secondary" style="margin-top:14px" href="${href(routes.security)}">${t("security")}</a></div>`;
      const form = document.querySelector("[data-settings]");
      form.elements.language.value = s.language || I.getLanguage();
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector("button"),
          data = Object.fromEntries(new FormData(form));
        for (const name of [
          "profileVisible",
          "inAppEnabled",
          "emailEnabled",
          "jobAlertsEnabled",
          "profileViewEnabled",
        ])
          data[name] = form.elements[name].checked;
        busy(button, true);
        try {
          await api("/api/candidate/settings", {
            method: "PATCH",
            body: JSON.stringify(data),
          });
          form.querySelector("[data-status]").textContent = t("savedSuccess");
          if (data.language !== I.getLanguage()) I.setLanguage(data.language);
        } catch (error) {
          toast(error.message, true);
        } finally {
          busy(button, false);
        }
      });
    } catch {
      main.innerHTML = page(t("settings")) + errorState();
    }
  }
  function security() {
    const main = document.querySelector("main");
    main.innerHTML =
      page(
        t("security"),
        t("passwordHelp"),
        `<a class="wc-button wc-button--secondary" href="${href(routes.settings)}">${t("settings")}</a>`,
      ) +
      `<form class="cand-form cand-card" data-security style="max-width:720px"><div class="cand-field"><label>${t("currentPassword")}</label><input class="cand-input" type="password" name="currentPassword" required autocomplete="current-password"></div><div class="cand-field"><label>${t("newPassword")}</label><input class="cand-input" type="password" name="newPassword" required minlength="8" autocomplete="new-password"></div><div class="cand-field"><label>${t("confirmPassword")}</label><input class="cand-input" type="password" name="confirmPassword" required minlength="8" autocomplete="new-password"></div><p class="cand-status" data-status>${t("passwordHelp")}</p><button class="wc-button wc-button--primary" style="justify-self:start">${t("changePassword")}</button></form>`;
    const form = document.querySelector("[data-security]");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form)),
        status = form.querySelector("[data-status]"),
        button = form.querySelector("button");
      if (data.newPassword !== data.confirmPassword) {
        status.className = "cand-status is-error";
        status.textContent = t("confirmPassword");
        return;
      }
      busy(button, true);
      try {
        await api("/api/auth/change-password", {
          method: "POST",
          body: JSON.stringify(data),
        });
        form.reset();
        status.className = "cand-status is-success";
        status.textContent = t("passwordChanged");
      } catch (error) {
        status.className = "cand-status is-error";
        status.textContent = error.message;
      } finally {
        busy(button, false);
      }
    });
  }
  async function logout() {
    if (!confirm(t("logoutConfirm"))) return;
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
    } finally {
      location.href = href("/");
    }
  }
  async function init() {
    I.apply();
    shell();
    try {
      await userHeader();
      notificationCount();
    } catch {
      location.href = href("/connexion/");
      return;
    }
    const view = document.body.dataset.candidateView || "dashboard",
      handlers = {
        dashboard,
        jobs,
        jobDetail,
        saved: () => jobs(true),
        alerts,
        applications,
        applicationDetail,
        documents,
        interviews,
        profile,
        profileEdit: () => profile(true),
        notifications,
        settings,
        security,
      };
    await (handlers[view] || dashboard)();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
