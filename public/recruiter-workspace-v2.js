(() => {
  const I = window.workcruteRecruiterI18n,
    { t } = I,
    root = location.pathname.startsWith("/Workcrute/") ? "/Workcrute" : "",
    href = (p) => root + p,
    api = (p, o) => window.workcrute.api(p, o),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>'"]/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[c],
      ),
    parse = (v, f) => {
      try {
        return typeof v === "string" ? JSON.parse(v) : (v ?? f);
      } catch {
        return f;
      }
    },
    date = (v) =>
      v
        ? new Intl.DateTimeFormat(I.getLanguage(), {
            dateStyle: "medium",
          }).format(new Date(v))
        : t("empty"),
    dateTime = (v) =>
      v
        ? new Intl.DateTimeFormat(I.getLanguage(), {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(v))
        : t("empty");
  const routes = {
      dashboard: "/recruteur/tableau-de-bord",
      jobs: "/recruteur/offres",
      createJob: "/recruteur/offres/nouvelle",
      applications: "/recruteur/candidatures",
      candidates: "/recruteur/candidats",
      interviews: "/recruteur/entretiens",
      company: "/recruteur/entreprise",
      questionnaires: "/recruteur/questionnaires",
      notifications: "/recruteur/notifications",
      settings: "/recruteur/parametres",
      security: "/recruteur/securite",
    },
    path = location.pathname.replace(root, "").replace(/\/$/, ""),
    nav = [
      ["dashboard", "▦"],
      ["jobs", "▤"],
      ["createJob", "＋"],
      ["applications", "◫"],
      ["candidates", "♙"],
      ["questionnaires", "☷"],
      ["interviews", "▣"],
      ["company", "▱"],
      ["notifications", "◌"],
      ["settings", "⚙"],
    ],
    current = (k) => path === routes[k] || path.startsWith(routes[k] + "/"),
    link = ([k, i]) =>
      `<a href="${href(routes[k])}" ${current(k) ? 'aria-current="page"' : ""}><span class="rec-nav-icon">${i}</span><span>${t(k)}</span></a>`;
  function shell() {
    const siteName = window.WorkcruteConfig?.general?.siteName || "Workcrute";
    document.body.className = "recruiter-body";
    document.body.innerHTML = `<a class="wc-skip-link" href="#rec-content">${t("viewAll")}</a><aside class="rec-sidebar"><a class="rec-brand" href="${href(routes.dashboard)}"><span class="rec-brand-mark">W</span>Workcrute</a><p class="rec-workspace-label">Recruitment workspace</p><nav class="rec-nav">${nav.map(link).join("")}</nav><div class="rec-sidebar-foot"><button class="rec-logout" data-logout-rec><span class="rec-nav-icon">↪</span>${t("logout")}</button></div></aside><div class="rec-main"><header class="rec-topbar"><div class="rec-mobile-head"><button class="rec-icon" data-menu aria-label="${t("menu")}">☰</button><span class="rec-brand-mark">W</span></div><div class="rec-top-actions"><select class="rec-select" data-language aria-label="${t("language")}"><option value="fr">FR</option><option value="en">EN</option><option value="ar">AR</option></select><a class="rec-icon" href="${href(routes.notifications)}" aria-label="${t("notifications")}">♢<span class="rec-badge" data-badge hidden>0</span></a><a class="rec-user" href="${href(routes.company)}"><span class="rec-avatar" data-avatar>?</span><span class="rec-user-copy"><strong data-name>—</strong><small data-company>—</small></span></a></div></header><main class="rec-content" id="rec-content"><div class="rec-loading"><div><div class="rec-skeleton"></div><div class="rec-skeleton"></div><p>${t("loading")}</p></div></div></main></div><nav class="rec-bottom">${[
      ["dashboard", "⌂"],
      ["jobs", "▤"],
      ["applications", "◫"],
      ["interviews", "▣"],
    ]
      .map(link)
      .join(
        "",
      )}<button data-menu><span class="rec-nav-icon">☰</span><span>${t("menu")}</span></button></nav>`;
    document.querySelector(".rec-workspace-label").textContent = t("workspace");
    const brand = document.querySelector(".rec-brand");
    if (brand?.lastChild) brand.lastChild.textContent = siteName;
    bindShell();
  }
  function bindShell() {
    const side = document.querySelector(".rec-sidebar");
    document.querySelectorAll("[data-menu]").forEach((b) =>
      b.addEventListener("click", () => {
        const open = !side.classList.contains("open");
        side.classList.toggle("open", open);
        document.querySelector(".rec-overlay")?.remove();
        if (open) {
          const o = document.createElement("button");
          o.className = "rec-overlay";
          o.setAttribute("aria-label", t("menu"));
          o.onclick = () => {
            side.classList.remove("open");
            o.remove();
          };
          document.body.append(o);
        }
      }),
    );
    const lang = document.querySelector("[data-language]");
    lang.value = I.getLanguage();
    lang.onchange = () => I.setLanguage(lang.value);
    document.querySelector("[data-logout-rec]").onclick = logout;
  }
  const main = () => document.querySelector("main"),
    head = (title, sub = "", action = "") =>
      `<div class="rec-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${action}</div>`,
    empty = (title, help, action = "") =>
      `<div class="rec-empty"><div><strong>${title}</strong><p>${help}</p>${action}</div></div>`,
    errorState = () => { const error=window.WorkcruteErrors?.lastError,reference=error?.requestId?`<p class="wc-system-reference">${window.WorkcruteErrors.reference(error.requestId)}</p>`:"";return `<div class="rec-error"><div><strong>${t("error")}</strong><p>${error?.userMessage||t("retry")}</p>${reference}<button class="rec-button secondary" onclick="location.reload()">${t("retry")}</button></div></div>`; },
    toast = (msg, error = false) => {
      document.querySelector(".rec-toast")?.remove();
      const n = document.createElement("div");
      n.className = "rec-toast" + (error ? " error" : "");
      n.textContent = msg;
      document.body.append(n);
      setTimeout(() => n.remove(), 3200);
    },
    busy = (b, on) => {
      b.disabled = on;
      if (on) {
        b.dataset.idle = b.textContent;
        b.textContent = t("loading");
      } else if (b.dataset.idle) b.textContent = b.dataset.idle;
    },
    pill = (s) =>
      `<span class="rec-pill ${["published", "accepted", "confirmed", "completed"].includes(s) ? "green" : ["submitted", "reviewing"].includes(s) ? "blue" : ["shortlisted", "interview", "scheduled"].includes(s) ? "amber" : "red"}">${t(s) || s}</span>`;
  async function header() {
    const d = await api("/api/auth/me");
    if (d.user.role !== "recruiter") throw Error("forbidden");
    document.querySelector("[data-name]").textContent =
      [d.profile.first_name, d.profile.last_name].filter(Boolean).join(" ") ||
      d.user.email;
    document.querySelector("[data-company]").textContent =
      d.profile.company_name || t("company");
    document.querySelector("[data-avatar]").textContent = (
      d.profile.first_name?.[0] || d.user.email[0]
    ).toUpperCase();
    try {
      const n = await api("/api/notifications"),
        count = (n.items || []).filter((x) => !x.read_at).length,
        b = document.querySelector("[data-badge]");
      b.textContent = count;
      b.hidden = !count;
    } catch {}
    return d;
  }
  async function dashboard() {
    try {
      const d = await api("/api/recruiter/overview"),
        me = await api("/api/auth/me");
      main().innerHTML =
        head(
          `${t("hello")} ${esc(me.profile.first_name || "")}`,
          t("dashboardIntro"),
          `<a class="rec-button primary" href="${href(routes.createJob)}">＋ ${t("createJob")}</a>`,
        ) +
        `<section class="rec-grid rec-stats">${[
          ["▤", d.stats.activeJobs, "activeJobs"],
          ["◫", d.stats.newApplications, "newApplications"],
          ["☆", d.stats.shortlisted, "shortlisted"],
          ["▣", d.stats.interviews, "interviews"],
        ]
          .map(
            ([i, v, k]) =>
              `<div class="rec-card rec-stat"><span class="rec-stat-icon">${i}</span><div><strong>${v}</strong><span>${t(k)}</span></div></div>`,
          )
          .join(
            "",
          )}</section><div class="rec-grid rec-cols" style="margin-top:18px"><section class="rec-card"><div class="rec-card-head"><h2>${t("recentApplications")}</h2><a href="${href(routes.applications)}">${t("viewAll")}</a></div>${d.recentApplications.length ? d.recentApplications.map((a) => `<div class="rec-row"><div><h3><a href="${href(routes.applications + `/detail/?id=${a.id}`)}">${esc(a.first_name)} ${esc(a.last_name)}</a></h3><div class="rec-meta"><span>${esc(a.title)}</span><span>${date(a.created_at)}</span></div></div>${pill(a.status)}</div>`).join("") : empty(t("noApplications"), t("noApplicationsHelp"))}</section><aside class="rec-card"><div class="rec-card-head"><h2>${t("performance")}</h2><a href="${href(routes.jobs)}">${t("viewAll")}</a></div>${d.performance.length ? d.performance.map((j) => `<div class="rec-row"><div><h3>${esc(j.title)}</h3><div class="rec-meta"><span>${j.applications} ${t("applicationsCount")}</span><span>${j.shortlisted || 0} ${t("shortlisted")}</span></div></div>${pill(j.status)}</div>`).join("") : empty(t("noJobs"), t("noJobsHelp"))}</aside></div><section class="rec-card" style="margin-top:18px"><div class="rec-card-head"><h2>${t("recommended")}</h2><span class="rec-pill">${t("matchingUnavailable")}</span></div>${empty(t("noRecommendations"), t("noRecommendationsHelp"), `<a class="rec-button secondary" href="${href(routes.candidates)}">${t("searchCandidates")}</a>`)}</section>`;
    } catch (e) {
      console.error(e);
      main().innerHTML = head(t("dashboard")) + errorState();
    }
  }
  async function jobs() {
    main().innerHTML =
      head(
        t("jobs"),
        t("performance"),
        `<a class="rec-button primary" href="${href(routes.createJob)}">＋ ${t("createJob")}</a>`,
      ) +
      `<div class="rec-grid" data-list><div class="rec-loading">${t("loading")}</div></div>`;
    try {
      const d = await api("/api/recruiter/jobs"),
        list = document.querySelector("[data-list]");
      list.innerHTML = d.items.length
        ? d.items
            .map(
              (j) =>
                `<article class="rec-card rec-row"><div><h2><a href="${href(routes.jobs + `/detail/?id=${j.id}`)}">${esc(j.title)}</a></h2><div class="rec-meta"><span>${esc(j.city)}</span><span>${esc(j.contract_type)}</span><span>${date(j.created_at)}</span><span>${j.applications || 0} ${t("applicationsCount")}</span></div></div><div class="rec-actions">${pill(j.status)}<a class="rec-button secondary" href="${href(routes.jobs + `/modifier/?id=${j.id}`)}">${t("edit")}</a><button class="rec-button secondary" data-duplicate="${j.id}">${t("duplicate")}</button></div></article>`,
            )
            .join("")
        : empty(
            t("noJobs"),
            t("noJobsHelp"),
            `<a class="rec-button primary" href="${href(routes.createJob)}">${t("createJob")}</a>`,
          );
      document.querySelectorAll("[data-duplicate]").forEach(
        (b) =>
          (b.onclick = async () => {
            busy(b, true);
            try {
              const d = await api(
                `/api/recruiter/jobs/${b.dataset.duplicate}/duplicate`,
                { method: "POST", body: "{}" },
              );
              location.href = href(routes.jobs + `/modifier/?id=${d.job.id}`);
            } catch (e) {
              toast(e.message, true);
            }
          }),
      );
    } catch {
      document.querySelector("[data-list]").innerHTML = errorState();
    }
  }
  const jobFields = () => [
    {
      key: "general",
      html: `<div class="rec-form-grid"><div class="rec-field"><label>${t("title")} *</label><input class="rec-input" name="title" required maxlength="160"></div><div class="rec-field"><label>${t("sector")} *</label><select class="rec-select" name="domain" required><option value="">—</option>${(window.WorkcruteConfig?.jobs?.sectors||[]).map(value=>`<option>${esc(value)}</option>`).join("")}</select></div><div class="rec-field"><label>${t("city")} *</label><input class="rec-input" name="city" required></div><div class="rec-field"><label>${t("country")}</label><input class="rec-input" name="country" value="Maroc"></div><div class="rec-field"><label>${t("contract")} *</label><select class="rec-select" name="contractType" required><option value="">—</option>${(window.WorkcruteConfig?.jobs?.contractTypes||[]).map(value=>`<option>${esc(value)}</option>`).join("")}</select></div><div class="rec-field"><label>${t("workMode")} *</label><select class="rec-select" name="workMode" required><option value="onsite">${t("onsite")}</option><option value="hybrid">${t("hybrid")}</option><option value="remote">${t("remote")}</option></select></div></div>`,
    },
    {
      key: "description",
      html: `<div class="rec-field"><label>${t("description")} *</label><textarea class="rec-textarea" name="description" required maxlength="5000"></textarea></div><div class="rec-field"><label>${t("missions")}</label><textarea class="rec-textarea" name="missions"></textarea></div><div class="rec-field"><label>${t("responsibilities")}</label><textarea class="rec-textarea" name="responsibilities"></textarea></div>`,
    },
    {
      key: "criteria",
      html: `<div class="rec-form-grid"><div class="rec-field rec-full"><label>${t("skills")}</label><input class="rec-input" name="skills" placeholder="JavaScript, CSS"></div><div class="rec-field"><label>${t("experience")}</label><input class="rec-input" name="experienceLevel"></div><div class="rec-field"><label>${t("education")}</label><input class="rec-input" name="educationLevel"></div></div>`,
    },
    {
      key: "conditions",
      html: `<div class="rec-form-grid"><div class="rec-field"><label>${t("salaryMin")}</label><input class="rec-input" type="number" name="salaryMin" min="0"></div><div class="rec-field"><label>${t("salaryMax")}</label><input class="rec-input" type="number" name="salaryMax" min="0"></div><div class="rec-field"><label>${t("openings")}</label><input class="rec-input" type="number" name="openingsCount" min="1" value="1"></div><div class="rec-field"><label>${t("deadline")}</label><input class="rec-input" type="date" name="deadlineAt"></div><div class="rec-field rec-full"><label>${t("benefits")}</label><textarea class="rec-textarea" name="benefits"></textarea></div></div>`,
    },
    {
      key: "questionnaire",
      html: `<div class="rec-field"><label>${t("questionnaire")}</label><select class="rec-select" name="questionnaireId" data-questionnaire-select><option value="">—</option></select></div><p class="rec-status">${t("noQuestionnairesHelp")}</p>`,
    },
    { key: "review", html: `<div class="rec-card" data-preview></div>` },
  ];
  async function jobWizard(edit = false) {
    const id = new URLSearchParams(location.search).get("id"),
      steps = jobFields();
    main().innerHTML =
      head(
        edit ? t("edit") : t("createJob"),
        t("saveDraft"),
        `<a class="rec-button secondary" href="${href(routes.jobs)}">${t("jobs")}</a>`,
      ) +
      `<div class="rec-wizard-progress">${steps.map((s, i) => `<button class="rec-step ${i === 0 ? "active" : ""}" type="button" data-step="${i}">${i + 1}. ${t(s.key)}</button>`).join("")}</div><form class="rec-card rec-form" data-job-form>${steps.map((s, i) => `<section class="rec-wizard-panel" data-panel="${i}" ${i ? "hidden" : ""}><h2>${t(s.key)}</h2><div style="margin-top:17px">${s.html}</div></section>`).join("")}<p class="rec-status" data-status></p><div class="rec-actions"><button class="rec-button secondary" type="button" data-back>${t("back")}</button><button class="rec-button secondary" type="button" data-draft>${t("saveDraft")}</button><button class="rec-button primary" type="button" data-next>${t("next")}</button><button class="rec-button primary" type="submit" data-publish hidden>${t("publish")}</button></div></form>`;
    const form = document.querySelector("[data-job-form]"),
      status = form.querySelector("[data-status]");
    let index = 0,
      currentId = id,
      autosave;
    const qs = await api("/api/recruiter/questionnaires").catch(() => ({
      items: [],
    }));
    document.querySelector("[data-questionnaire-select]").innerHTML += qs.items
      .map((q) => `<option value="${q.id}">${esc(q.name)}</option>`)
      .join("");
    if (edit && id) {
      const d = await api(`/api/recruiter/jobs/${id}`),
        j = d.job;
      for (const el of form.elements) {
        if (!el.name) continue;
        let v =
          j[el.name] ??
          j[el.name.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())];
        if (el.name === "skills") v = parse(j.required_skills, []).join(", ");
        if (v != null) el.value = v;
      }
    }
    const data = (statusValue) => {
        const o = Object.fromEntries(new FormData(form));
        o.skills = o.skills
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        o.status = statusValue;
        return o;
      },
      render = () => {
        document
          .querySelectorAll("[data-panel]")
          .forEach((p, i) => (p.hidden = i !== index));
        document.querySelectorAll("[data-step]").forEach((s, i) => {
          s.classList.toggle("active", i === index);
          s.classList.toggle("done", i < index);
        });
        form.querySelector("[data-back]").disabled = index === 0;
        form.querySelector("[data-next]").hidden = index === steps.length - 1;
        form.querySelector("[data-publish]").hidden =
          index !== steps.length - 1;
        if (index === steps.length - 1) {
          const d = data("draft");
          document.querySelector("[data-preview]").innerHTML =
            `<h2>${esc(d.title || t("previewJob"))}</h2><div class="rec-meta"><span>${esc(d.city)}</span><span>${esc(d.contractType)}</span><span>${esc(d.workMode)}</span></div><h3>${t("description")}</h3><p>${esc(d.description)}</p><div class="rec-actions">${d.skills.map((x) => `<span class="rec-pill">${esc(x)}</span>`).join("")}</div>`;
        }
      };
    const save = async (statusValue = "draft", quiet = false) => {
      const button = form.querySelector(
        statusValue === "published" ? "[data-publish]" : "[data-draft]",
      );
      if (button.disabled) return;
      busy(button, true);
      try {
        const d = await api(
          currentId
            ? `/api/recruiter/jobs/${currentId}`
            : "/api/recruiter/jobs",
          {
            method: currentId ? "PATCH" : "POST",
            body: JSON.stringify(data(statusValue)),
          },
        );
        currentId = d.job.id;
        history.replaceState(
          null,
          "",
          href(routes.jobs + `/modifier/?id=${currentId}`),
        );
        status.className = "rec-status success";
        status.textContent =
          statusValue === "published"
            ? t("jobPublished")
            : t(quiet ? "autosaved" : "jobSaved");
        if (statusValue === "published")
          setTimeout(
            () =>
              (location.href = href(routes.jobs + `/detail/?id=${currentId}`)),
            500,
          );
      } catch (e) {
        status.className = "rec-status error";
        status.textContent = e.message;
      } finally {
        busy(button, false);
      }
    };
    form.addEventListener("input", () => {
      clearTimeout(autosave);
      autosave = setTimeout(() => save("draft", true), 1200);
    });
    form.querySelector("[data-back]").onclick = () => {
      if (index) {
        index--;
        render();
      }
    };
    form.querySelector("[data-next]").onclick = () => {
      const fields = [
        ...form
          .querySelector(`[data-panel="${index}"]`)
          .querySelectorAll("[required]"),
      ];
      if (!fields.every((f) => f.reportValidity())) return;
      if (index < steps.length - 1) {
        index++;
        render();
      }
    };
    document.querySelectorAll("[data-step]").forEach(
      (s) =>
        (s.onclick = () => {
          index = Number(s.dataset.step);
          render();
        }),
    );
    form.querySelector("[data-draft]").onclick = () => save("draft");
    form.onsubmit = (e) => {
      e.preventDefault();
      if (form.reportValidity()) save("published");
    };
    render();
  }
  async function jobDetail() {
    const id = new URLSearchParams(location.search).get("id");
    try {
      const { job: j } = await api(`/api/recruiter/jobs/${id}`);
      main().innerHTML =
        head(
          t("jobDetails"),
          `${esc(j.company_name || "")} · ${date(j.created_at)}`,
          `<div class="rec-actions"><a class="rec-button secondary" href="${href(routes.jobs + `/modifier/?id=${id}`)}">${t("edit")}</a>${j.status !== "published" ? `<button class="rec-button primary" data-publish>${t("publish")}</button>` : ""}</div>`,
        ) +
        `<div class="rec-grid rec-cols"><article class="rec-card"><div class="rec-card-head"><h2>${esc(j.title)}</h2>${pill(j.status)}</div><div class="rec-detail"><div><dt>${t("city")}</dt><dd>${esc(j.city)}</dd></div><div><dt>${t("contract")}</dt><dd>${esc(j.contract_type)}</dd></div><div><dt>${t("workMode")}</dt><dd>${esc(j.work_mode)}</dd></div><div><dt>${t("sector")}</dt><dd>${esc(j.domain)}</dd></div></div><h3>${t("description")}</h3><p>${esc(j.description)}</p><h3>${t("missions")}</h3><p>${esc(j.missions || t("empty"))}</p><div class="rec-actions">${parse(
          j.required_skills,
          [],
        )
          .map((x) => `<span class="rec-pill">${esc(x)}</span>`)
          .join(
            "",
          )}</div></article><aside class="rec-card"><h2>${t("performance")}</h2><p>${t("applicationsCount")}: ${j.applications || 0}</p><a class="rec-button primary" href="${href(routes.applications + `/?jobId=${id}`)}">${t("applications")}</a></aside></div>`;
      document
        .querySelector("[data-publish]")
        ?.addEventListener("click", async () => {
          await api(`/api/recruiter/jobs/${id}/publish`, {
            method: "POST",
            body: "{}",
          });
          location.reload();
        });
    } catch {
      main().innerHTML = head(t("jobDetails")) + errorState();
    }
  }
  async function questionnaires() {
    main().innerHTML =
      head(
        t("questionnaires"),
        t("noQuestionnairesHelp"),
        `<button class="rec-button primary" data-new-q>＋ ${t("createQuestionnaire")}</button>`,
      ) +
      `<section class="rec-card" data-q-form hidden><form class="rec-form"><div class="rec-field"><label>${t("questionnaireName")}</label><input class="rec-input" name="name" required></div><div class="rec-field"><label>${t("description")}</label><textarea class="rec-textarea" name="description"></textarea></div><button class="rec-button primary">${t("save")}</button></form></section><section class="rec-card" style="margin-top:18px"><div class="rec-card-head"><div><h2>${t("availableTemplates")}</h2><p>${t("templateHelp")}</p></div></div><div class="rec-grid rec-cards" data-template-list></div></section><div class="rec-grid rec-cards" style="margin-top:18px" data-q-list></div>`;
    const load = async () => {
      const d = await api("/api/recruiter/questionnaires"),
        l = document.querySelector("[data-q-list]"), templates=document.querySelector("[data-template-list]");
      templates.innerHTML=d.templates.length?d.templates.map(q=>`<article class="rec-card"><h3>${esc(q.name)}</h3><p>${esc(q.description||"")}</p><div class="rec-meta"><span>${q.question_count} ${t("questions")}</span></div><button class="rec-button secondary" data-use-template="${q.id}">${t("useTemplate")}</button></article>`).join(""):empty(t("availableTemplates"),t("empty"));
      templates.querySelectorAll("[data-use-template]").forEach(button=>button.onclick=async()=>{button.disabled=true;try{const created=await api("/api/recruiter/questionnaires",{method:"POST",body:JSON.stringify({templateId:button.dataset.useTemplate})});location.href=href(routes.questionnaires+`/detail/?id=${created.questionnaire.id}`);}catch(error){button.disabled=false;throw error;}});
      l.innerHTML = d.items.length
        ? d.items
            .map(
              (q) =>
                `<article class="rec-card"><div class="rec-card-head"><h2><a href="${href(routes.questionnaires + `/detail/?id=${q.id}`)}">${esc(q.name)}</a></h2>${pill(q.status)}</div><p>${esc(q.description || "")}</p><div class="rec-meta"><span>${q.question_count} questions</span><span>${q.usage_count} ${t("jobs")}</span></div></article>`,
            )
            .join("")
        : empty(t("noQuestionnaires"), t("noQuestionnairesHelp"));
    };
    const wrap = document.querySelector("[data-q-form]");
    document.querySelector("[data-new-q]").onclick = () => {
      wrap.hidden = !wrap.hidden;
    };
    wrap.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const d = await api("/api/recruiter/questionnaires", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      location.href = href(
        routes.questionnaires + `/detail/?id=${d.questionnaire.id}`,
      );
    };
    load();
  }
  async function questionnaireDetail() {
    const id = new URLSearchParams(location.search).get("id"),
      d = await api(`/api/recruiter/questionnaires/${id}`);
    main().innerHTML =
      head(
        d.questionnaire.name,
        d.questionnaire.description || "",
        `<a class="rec-button secondary" href="${href(routes.questionnaires)}">${t("questionnaires")}</a>`,
      ) +
      `<div class="rec-grid rec-cols"><section class="rec-card"><div class="rec-card-head"><h2>${t("questionnaire")}</h2><button class="rec-button primary" data-show-question>＋ ${t("addQuestion")}</button></div><div data-questions>${d.questions.length ? d.questions.map((q) => `<article class="rec-question"><div class="rec-card-head"><strong>${esc(parse(q.label_json, {}).fr)}</strong><button class="rec-icon" data-delete-question="${q.id}">×</button></div><div class="rec-meta"><span>${t({ short_text: "shortText", long_text: "longText", boolean: "yesNo", single_choice: "singleChoice", multiple_choice: "multipleChoice" }[q.question_type] || q.question_type)}</span><span>${t("weight")}: ${q.weight}</span>${q.is_required ? `<span>${t("required")}</span>` : ""}${q.is_eliminatory ? `<span>${t("eliminatory")}</span>` : ""}</div></article>`).join("") : empty(t("noQuestionnaires"), t("noQuestionnairesHelp"))}</div></section><aside class="rec-card" data-question-form hidden><h2>${t("addQuestion")}</h2><form class="rec-form" style="margin-top:16px"><div class="rec-field"><label>${t("questionLabel")} FR</label><input class="rec-input" name="label" required></div><div class="rec-field"><label>${t("questionLabel")} EN</label><input class="rec-input" name="labelEn"></div><div class="rec-field"><label>${t("questionLabel")} AR</label><input class="rec-input" name="labelAr" dir="rtl"></div><div class="rec-field"><label>${t("questionType")}</label><select class="rec-select" name="type">${[
        ["short_text", "shortText"],
        ["long_text", "longText"],
        ["number", "number"],
        ["boolean", "yesNo"],
        ["single_choice", "singleChoice"],
        ["multiple_choice", "multipleChoice"],
        ["date", "date"],
        ["rating", "rating"],
        ["upload", "upload"],
      ]
        .map(([v, k]) => `<option value="${v}">${t(k)}</option>`)
        .join(
          "",
        )}</select></div><div class="rec-field"><label>${t("options")}</label><input class="rec-input" name="options"></div><div class="rec-form-grid"><label><input type="checkbox" name="required"> ${t("required")}</label><label><input type="checkbox" name="eliminatory"> ${t("eliminatory")}</label><div class="rec-field"><label>${t("weight")}</label><input class="rec-input" type="number" name="weight" min="0" max="100" value="0"></div></div><button class="rec-button primary">${t("saveQuestion")}</button></form></aside></div>`;
    const wrap = document.querySelector("[data-question-form]");
    document.querySelector("[data-show-question]").onclick = () =>
      (wrap.hidden = !wrap.hidden);
    wrap.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const x = Object.fromEntries(new FormData(e.currentTarget));
      x.options = x.options
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      x.required = e.currentTarget.elements.required.checked;
      x.eliminatory = e.currentTarget.elements.eliminatory.checked;
      await api(`/api/recruiter/questionnaires/${id}/questions`, {
        method: "POST",
        body: JSON.stringify(x),
      });
      location.reload();
    };
    document.querySelectorAll("[data-delete-question]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (confirm(t("deleteConfirm"))) {
            await api(
              `/api/recruiter/questionnaires/${id}/questions/${b.dataset.deleteQuestion}`,
              { method: "DELETE" },
            );
            location.reload();
          }
        }),
    );
  }
  async function applications() {
    main().innerHTML =
      head(t("applications"), t("dragHelp")) +
      `<div class="rec-tabs"><button class="rec-tab active" data-view="list">${t("listView")}</button><button class="rec-tab" data-view="kanban">${t("kanbanView")}</button></div><div data-apps><div class="rec-loading">${t("loading")}</div></div>`;
    const query = location.search || "",
      d = await api("/api/recruiter/applications" + query),
      render = (view) => {
        const host = document.querySelector("[data-apps]");
        if (view === "list")
          host.innerHTML = d.items.length
            ? `<div class="rec-table-wrap"><table class="rec-table"><thead><tr><th>${t("candidate")}</th><th>${t("job")}</th><th>${t("city")}</th><th>${t("status")}</th><th>${t("date")}</th><th></th></tr></thead><tbody>${d.items.map((a) => `<tr><td><strong>${esc(a.first_name)} ${esc(a.last_name)}</strong><br><small>${esc(a.professional_title || "")}</small></td><td>${esc(a.title)}</td><td>${esc(a.city || "")}</td><td>${pill(a.status)}</td><td>${date(a.created_at)}</td><td><a class="rec-button secondary" href="${href(routes.applications + `/detail/?id=${a.id}`)}">${t("viewAll")}</a></td></tr>`).join("")}</tbody></table></div>`
            : empty(t("noApplications"), t("noApplicationsHelp"));
        else {
          const cols = [
            "submitted",
            "reviewing",
            "shortlisted",
            "interview",
            "accepted",
            "rejected",
          ];
          host.innerHTML = `<div class="rec-kanban">${cols
            .map(
              (s) =>
                `<section class="rec-column" data-drop="${s}"><div class="rec-column-head"><strong>${t(s)}</strong><span>${d.items.filter((a) => a.status === s).length}</span></div>${d.items
                  .filter((a) => a.status === s)
                  .map(
                    (a) =>
                      `<article class="rec-application" draggable="true" tabindex="0" data-app="${a.id}"><strong>${esc(a.first_name)} ${esc(a.last_name)}</strong><p>${esc(a.title)}</p><div class="rec-meta">${esc(a.city || "")}</div></article>`,
                  )
                  .join("")}</section>`,
            )
            .join("")}</div>`;
          bindDrag();
        }
      };
    function bindDrag() {
      let dragged;
      document
        .querySelectorAll("[data-app]")
        .forEach((card) =>
          card.addEventListener("dragstart", () => (dragged = card)),
        );
      document.querySelectorAll("[data-drop]").forEach((col) => {
        col.addEventListener("dragover", (e) => e.preventDefault());
        col.addEventListener("drop", async (e) => {
          e.preventDefault();
          if (!dragged) return;
          await api(`/api/recruiter/applications/${dragged.dataset.app}`, {
            method: "PATCH",
            body: JSON.stringify({ status: col.dataset.drop }),
          });
          const item = d.items.find((x) => x.id === dragged.dataset.app);
          item.status = col.dataset.drop;
          render("kanban");
        });
      });
    }
    document.querySelectorAll("[data-view]").forEach(
      (b) =>
        (b.onclick = () => {
          document
            .querySelectorAll("[data-view]")
            .forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          render(b.dataset.view);
        }),
    );
    render("list");
  }
  const scoreBlock = (m) =>
    m?.score == null
      ? empty(t("matchingUnavailable"), t("matchingHelp"))
      : `<div class="rec-actions"><div class="rec-score">${m.score}%</div><div style="flex:1">${m.breakdown.map((x) => `<div class="rec-score-row"><span>${t(x.key)}</span><div class="rec-progress"><i style="width:${x.score}%"></i></div><strong>${x.score}%</strong></div>`).join("")}</div></div>`;
  async function applicationDetail() {
    const id = new URLSearchParams(location.search).get("id"),
      d = await api(`/api/recruiter/applications/${id}`),
      a = d.application,
      skills = parse(a.skills_json, []);
    main().innerHTML =
      head(
        t("candidateProfile"),
        `${esc(a.title)} · ${date(a.created_at)}`,
        `<a class="rec-button secondary" href="${href(routes.applications)}">${t("applications")}</a>`,
      ) +
      `<div class="rec-actions" style="margin-bottom:18px"><button class="rec-button primary" data-status="shortlisted">${t("shortlisted")}</button><a class="rec-button secondary" href="mailto:${esc(a.candidate_email)}">${t("contact")}</a><button class="rec-button secondary" data-interview>${t("planInterview")}</button><button class="rec-button danger" data-status="rejected">${t("reject")}</button></div><div class="rec-grid rec-cols"><section class="rec-grid"><article class="rec-card"><div class="rec-card-head"><h2>${esc(a.first_name)} ${esc(a.last_name)}</h2>${pill(a.status)}</div><div class="rec-detail"><div><dt>${t("job")}</dt><dd>${esc(a.professional_title || t("empty"))}</dd></div><div><dt>${t("city")}</dt><dd>${esc(a.city || t("empty"))}</dd></div><div><dt>${t("availability")}</dt><dd>${esc(a.availability || t("empty"))}</dd></div><div><dt>Email</dt><dd>${esc(a.candidate_email)}</dd></div></div><h3>${t("summary")}</h3><p>${esc(a.introduction || t("empty"))}</p><h3>${t("skills")}</h3><div class="rec-actions">${skills.length ? skills.map((x) => `<span class="rec-pill">${esc(x)}</span>`).join("") : t("empty")}</div></article><article class="rec-card"><h2>${t("documents")}</h2>${d.documents.length ? d.documents.map((doc) => `<div class="rec-row"><div><strong>${esc(doc.original_name)}</strong><div class="rec-meta">${esc(doc.kind)}</div></div><a class="rec-button secondary" href="/api/recruiter/documents/${doc.id}/download">${t("downloadCv")}</a></div>`).join("") : empty(t("documents"), t("empty"))}</article><article class="rec-card"><h2>${t("questionnaire")}</h2>${d.questionnaire?.questions?.length ? d.questionnaire.questions.map((q) => { const label=parse(q.label_json,{}),answer=d.questionnaire.answers?.[q.id]; return `<div class="rec-row"><div><strong>${esc(label[I.getLanguage()] || label.fr || "")}</strong><p>${answer == null || answer === "" ? t("empty") : esc(Array.isArray(answer) ? answer.join(", ") : answer)}</p></div></div>` }).join("") : empty(t("questionnaire"), t("empty"))}</article><article class="rec-card"><h2>${t("history")}</h2>${d.history.map((h) => `<div class="rec-row"><span>${t(h.status)}</span><small>${dateTime(h.created_at)}</small></div>`).join("")}</article></section><aside class="rec-grid"><section class="rec-card"><h2>${t("matching")}</h2><div style="margin-top:16px">${scoreBlock(d.matching)}</div></section><section class="rec-card"><h2>${t("internalNotes")}</h2><p class="rec-status">${t("notePrivate")}</p><form class="rec-form" data-note><textarea class="rec-textarea" name="content" required maxlength="2000"></textarea><button class="rec-button primary">${t("addNote")}</button></form><div style="margin-top:17px">${d.notes.length ? d.notes.map((n) => `<div class="rec-row"><div><p>${esc(n.content)}</p><small>${esc(n.first_name)} ${esc(n.last_name)} · ${dateTime(n.created_at)}</small></div></div>`).join("") : empty(t("noNotes"), t("notePrivate"))}</div></section></aside></div>`;
    const questionnaireCard=[...document.querySelectorAll(".rec-card")].find(card=>card.querySelector("h2")?.textContent===t("questionnaire"));
    if(questionnaireCard&&d.questionnaire?.evaluation){
      const evaluation=d.questionnaire.evaluation,summary=document.createElement("div");summary.className="rec-meta";
      if(evaluation.score!=null){const score=document.createElement("span");score.textContent=`${t("questionnaireScore")}: ${evaluation.score}%`;summary.append(score);}
      if(evaluation.unmetCriteria?.length){const warning=document.createElement("span");warning.className="rec-pill danger";warning.textContent=`${t("criterionNotSatisfied")}: ${evaluation.unmetCriteria.length}`;summary.append(warning);}
      questionnaireCard.querySelector("h2").after(summary);
    }
    document.querySelectorAll("[data-status]").forEach(
      (b) =>
        (b.onclick = async () => {
          await api(`/api/recruiter/applications/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: b.dataset.status }),
          });
          location.reload();
        }),
    );
    document.querySelector("[data-note]").onsubmit = async (e) => {
      e.preventDefault();
      await api(`/api/recruiter/applications/${id}/notes`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      location.reload();
    };
    document.querySelector("[data-interview]").onclick = () =>
      (location.href = href(routes.interviews + `/?applicationId=${id}`));
  }
  async function candidates() {
    main().innerHTML =
      head(t("searchCandidates"), t("noCandidatesHelp")) +
      `<form class="rec-toolbar" data-search><input class="rec-input" name="q" placeholder="${t("keyword")}"><input class="rec-input" name="city" placeholder="${t("city")}"><button class="rec-button primary">${t("search")}</button></form><div class="rec-grid rec-cards" data-candidates></div>`;
    const load = async (form) => {
      const q = form ? "?" + new URLSearchParams(new FormData(form)) : "",
        d = await api("/api/recruiter/candidates" + q),
        h = document.querySelector("[data-candidates]");
      h.innerHTML = d.items.length
        ? d.items
            .map(
              (c) =>
                `<article class="rec-card"><div class="rec-card-head"><div class="rec-avatar">${esc(c.first_name?.[0] || "?")}</div><span class="rec-pill">${t("matchingUnavailable")}</span></div><h2>${esc(c.first_name)} ${esc(c.last_name)}</h2><p>${esc(c.professional_title || t("empty"))}</p><div class="rec-meta"><span>${esc(c.city || "")}</span><span>${esc(c.availability || "")}</span></div><a class="rec-button primary" style="margin-top:16px" href="${href(routes.candidates + `/profil/?id=${c.user_id}`)}">${t("viewAll")}</a></article>`,
            )
            .join("")
        : empty(t("noCandidates"), t("noCandidatesHelp"));
    };
    const f = document.querySelector("[data-search]");
    f.onsubmit = (e) => {
      e.preventDefault();
      load(f);
    };
    load();
  }
  async function candidateProfile() {
    const id = new URLSearchParams(location.search).get("id"),
      d = await api(`/api/recruiter/candidates/${id}`),
      c = d.candidate;
    main().innerHTML =
      head(
        t("candidateProfile"),
        `${esc(c.professional_title || "")} · ${esc(c.city || "")}`,
        `<a class="rec-button secondary" href="${href(routes.candidates)}">${t("candidates")}</a>`,
      ) +
      `<div class="rec-grid rec-cols"><article class="rec-card"><div class="rec-card-head"><h2>${esc(c.first_name)} ${esc(c.last_name)}</h2><a class="rec-button secondary" href="mailto:${esc(c.email)}">${t("contact")}</a></div><div class="rec-detail"><div><dt>${t("city")}</dt><dd>${esc(c.city || t("empty"))}</dd></div><div><dt>${t("availability")}</dt><dd>${esc(c.availability || t("empty"))}</dd></div></div><h3>${t("summary")}</h3><p>${esc(c.introduction || t("empty"))}</p><h3>${t("skills")}</h3><div class="rec-actions">${
        parse(c.skills_json, [])
          .map((x) => `<span class="rec-pill">${esc(x)}</span>`)
          .join("") || t("empty")
      }</div><h3>${t("experience")}</h3><p>${parse(c.experience_json, []).map(esc).join(" · ") || t("empty")}</p><h3>${t("education")}</h3><p>${parse(c.education_json, []).map(esc).join(" · ") || t("empty")}</p><h3>${t("languages")}</h3><p>${parse(c.languages_json, []).map(esc).join(" · ") || t("empty")}</p></article><aside class="rec-grid"><section class="rec-card"><h2>${t("matching")}</h2>${scoreBlock(d.matching)}</section><section class="rec-card"><h2>${t("documents")}</h2>${d.documents.map((doc) => `<div class="rec-row"><strong>${esc(doc.original_name)}</strong><span>${esc(doc.kind)}</span></div>`).join("") || t("empty")}</section></aside></div>`;
  }
  async function interviews() {
    const appId = new URLSearchParams(location.search).get("applicationId");
    main().innerHTML =
      head(
        t("interviews"),
        t("noInterviewsHelp"),
        `<button class="rec-button primary" data-show-interview>＋ ${t("createInterview")}</button>`,
      ) +
      `<section class="rec-card" data-interview-form ${appId ? "" : "hidden"}><form class="rec-form"><input type="hidden" name="interviewId"><div class="rec-form-grid"><div class="rec-field"><label>${t("selectApplication")}</label><select class="rec-select" name="applicationId" required></select></div><div class="rec-field"><label>${t("startAt")}</label><input class="rec-input" type="datetime-local" name="startsAt" required></div><div class="rec-field"><label>${t("type")}</label><select class="rec-select" name="type"><option value="onsite">${t("onsite")}</option><option value="phone">${t("phone")}</option><option value="video">${t("video")}</option></select></div><div class="rec-field"><label>${t("duration")}</label><input class="rec-input" type="number" name="duration" value="60" min="15"></div><div class="rec-field rec-full"><label>${t("addressOrLink")}</label><input class="rec-input" name="location"></div></div><button class="rec-button primary">${t("save")}</button></form></section><div class="rec-tabs" style="margin-top:18px"><button class="rec-tab active" data-filter="upcoming">${t("upcoming")}</button><button class="rec-tab" data-filter="past">${t("past")}</button><button class="rec-tab" data-filter="cancelled">${t("cancelled")}</button></div><div class="rec-grid" data-interviews></div>`;
    const [d, apps] = await Promise.all([
        api("/api/recruiter/interviews"),
        api("/api/recruiter/applications"),
      ]),
      form = document.querySelector("[data-interview-form] form");
    form.elements.applicationId.innerHTML =
      `<option value="">—</option>` +
      apps.items
        .map(
          (a) =>
            `<option value="${a.id}">${esc(a.first_name)} ${esc(a.last_name)} · ${esc(a.title)}</option>`,
        )
        .join("");
    if (appId) form.elements.applicationId.value = appId;
    document.querySelector("[data-show-interview]").onclick = () =>
      (document.querySelector("[data-interview-form]").hidden = false);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const x = Object.fromEntries(new FormData(form));
      if (x.type === "video") x.meetingUrl = x.location;
      await api(x.interviewId ? `/api/recruiter/interviews/${x.interviewId}` : "/api/recruiter/interviews", {
        method: x.interviewId ? "PATCH" : "POST",
        body: JSON.stringify(x),
      });
      location.reload();
    };
    const render = (f) => {
      const now = new Date(),
        items = d.items.filter((x) =>
          f === "cancelled"
            ? x.status === "cancelled"
            : f === "past"
              ? new Date(x.starts_at) < now && x.status !== "cancelled"
              : new Date(x.starts_at) >= now && x.status !== "cancelled",
        ),
        h = document.querySelector("[data-interviews]");
      h.innerHTML = items.length
        ? items
            .map(
              (x) =>
                `<article class="rec-card rec-row"><div><h2>${esc(x.first_name)} ${esc(x.last_name)}</h2><div class="rec-meta"><span>${esc(x.title)}</span><span>${dateTime(x.starts_at)}</span><span>${t(x.interview_type)}</span><span>${esc(x.location || x.meeting_url || "")}</span></div></div><div class="rec-actions">${pill(x.status)}${f === "upcoming" ? `<button class="rec-button secondary" data-edit-interview="${x.id}">${t("edit")}</button>${x.status === "scheduled" ? `<button class="rec-button secondary" data-int-status="confirmed" data-id="${x.id}">${t("confirm")}</button>` : ""}<button class="rec-button danger" data-int-status="cancelled" data-id="${x.id}">${t("cancel")}</button>` : ""}</div></article>`,
            )
            .join("")
        : empty(t("noInterviews"), t("noInterviewsHelp"));
      document.querySelectorAll("[data-int-status]").forEach(
        (b) =>
          (b.onclick = async () => {
            await api(`/api/recruiter/interviews/${b.dataset.id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: b.dataset.intStatus }),
            });
            location.reload();
          }),
      );
      document.querySelectorAll("[data-edit-interview]").forEach((b) => {
        b.onclick = () => {
          const interview = d.items.find((x) => x.id === b.dataset.editInterview);
          if (!interview) return;
          const wrap = document.querySelector("[data-interview-form]");
          wrap.hidden = false;
          form.elements.interviewId.value = interview.id;
          form.elements.applicationId.value = interview.application_id;
          form.elements.startsAt.value = String(interview.starts_at).slice(0, 16);
          form.elements.type.value = interview.interview_type;
          form.elements.duration.value = interview.duration_minutes || 60;
          form.elements.location.value = interview.location || interview.meeting_url || "";
          wrap.scrollIntoView({ behavior: "smooth", block: "start" });
        };
      });
    };
    document.querySelectorAll("[data-filter]").forEach(
      (b) =>
        (b.onclick = () => {
          document
            .querySelectorAll("[data-filter]")
            .forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          render(b.dataset.filter);
        }),
    );
    render("upcoming");
  }
  async function company() {
    const d = await api("/api/recruiter/company"),
      c = d.company || {};
    main().innerHTML =
      head(t("company"), t("companyIntro")) +
      `<form class="rec-card rec-form" data-company><div class="rec-form-grid"><div class="rec-field"><label>${t("companyName")} *</label><input class="rec-input" name="name" required value="${esc(c.name || c.company_name)}"></div><div class="rec-field"><label>${t("sector")}</label><input class="rec-input" name="sector" value="${esc(c.sector || c.company_sector)}"></div><div class="rec-field"><label>${t("size")}</label><input class="rec-input" name="companySize" value="${esc(c.company_size)}"></div><div class="rec-field"><label>${t("city")}</label><input class="rec-input" name="city" value="${esc(c.city)}"></div><div class="rec-field"><label>${t("website")}</label><input class="rec-input" type="url" name="website" value="${esc(c.website)}"></div><div class="rec-field"><label>${t("jobTitle")}</label><input class="rec-input" name="jobTitle" value="${esc(c.job_title)}"></div><div class="rec-field rec-full"><label>${t("description")}</label><textarea class="rec-textarea" name="description" maxlength="2000">${esc(c.description)}</textarea></div><div class="rec-field rec-full"><label>${t("logoUrl")}</label><input class="rec-input" type="url" name="logoUrl" value="${esc(c.logo_url)}"></div></div><p class="rec-status" data-status></p><button class="rec-button primary" style="justify-self:start">${t("save")}</button></form>`;
    const f = document.querySelector("form[data-company]");
    f.onsubmit = async (e) => {
      e.preventDefault();
      const b = f.querySelector("button");
      busy(b, true);
      try {
        await api("/api/recruiter/company", {
          method: "PATCH",
          body: JSON.stringify(Object.fromEntries(new FormData(f))),
        });
        f.querySelector("[data-status]").textContent = t("saved");
      } catch (x) {
        f.querySelector("[data-status]").textContent = x.message;
      } finally {
        busy(b, false);
      }
    };
  }
  async function notifications() {
    main().innerHTML =
      head(
        t("notifications"),
        "",
        `<button class="rec-button secondary" data-read>${t("markAllRead")}</button>`,
      ) + `<section class="rec-card" data-notes></section>`;
    const load = async () => {
      const d = await api("/api/notifications"),
        h = document.querySelector("[data-notes]");
      h.innerHTML = d.items.length
        ? d.items
            .map(
              (n) =>
                `<div class="rec-row"><div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div><small>${dateTime(n.created_at)}</small></div>`,
            )
            .join("")
        : empty(t("noNotifications"), t("empty"));
    };
    document.querySelector("[data-read]").onclick = async () => {
      await api("/api/notifications", { method: "POST", body: "{}" });
      load();
    };
    load();
  }
  async function settings() {
    const { settings: s } = await api("/api/recruiter/settings");
    main().innerHTML =
      head(t("settings")) +
      `<form class="rec-card rec-form" data-settings><div class="rec-field" style="max-width:300px"><label>${t("language")}</label><select class="rec-select" name="language"><option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option></select></div>${[
        ["emailEnabled", "emailNotifications"],
        ["applicationAlerts", "applicationAlerts"],
        ["interviewAlerts", "interviewAlerts"],
        ["weeklyReport", "weeklyReport"],
      ]
        .map(
          ([n, k]) =>
            `<label class="rec-switch-row"><span>${t(k)}</span><input type="checkbox" name="${n}" ${s[n] ? "checked" : ""}></label>`,
        )
        .join(
          "",
        )}<p class="rec-status" data-status></p><button class="rec-button primary" style="justify-self:start">${t("save")}</button></form><div class="rec-card" style="margin-top:18px"><h2>${t("security")}</h2><a class="rec-button secondary" style="margin-top:14px" href="${href(routes.security)}">${t("security")}</a></div>`;
    const f = document.querySelector("[data-settings]");
    f.elements.language.value = s.language;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const x = { language: f.elements.language.value };
      [
        "emailEnabled",
        "applicationAlerts",
        "interviewAlerts",
        "weeklyReport",
      ].forEach((n) => (x[n] = f.elements[n].checked));
      await api("/api/recruiter/settings", {
        method: "PATCH",
        body: JSON.stringify(x),
      });
      f.querySelector("[data-status]").textContent = t("saved");
      if (x.language !== I.getLanguage()) I.setLanguage(x.language);
    };
  }
  function security() {
    main().innerHTML =
      head(t("security"), t("passwordHelp")) +
      `<form class="rec-card rec-form" data-security style="max-width:700px"><div class="rec-field"><label>${t("currentPassword")}</label><input class="rec-input" type="password" name="currentPassword" required></div><div class="rec-field"><label>${t("newPassword")}</label><input class="rec-input" type="password" name="newPassword" minlength="8" required></div><div class="rec-field"><label>${t("confirmPassword")}</label><input class="rec-input" type="password" name="confirmPassword" minlength="8" required></div><p class="rec-status" data-status></p><button class="rec-button primary" style="justify-self:start">${t("changePassword")}</button></form>`;
    const f = document.querySelector("[data-security]");
    f.onsubmit = async (e) => {
      e.preventDefault();
      const x = Object.fromEntries(new FormData(f));
      if (x.newPassword !== x.confirmPassword) {
        f.querySelector("[data-status]").textContent = t("confirmPassword");
        return;
      }
      try {
        await api("/api/auth/change-password", {
          method: "POST",
          body: JSON.stringify(x),
        });
        f.reset();
        f.querySelector("[data-status]").textContent = t("saved");
      } catch (err) {
        f.querySelector("[data-status]").textContent = err.message;
      }
    };
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
    await window.WorkcruteConfigReady;
    I.apply();
    shell();
    try {
      await header();
    } catch {
      location.href = href("/connexion/");
      return;
    }
    const view = document.body.dataset.recruiterView,
      handlers = {
        dashboard,
        jobs,
        jobCreate: () => jobWizard(false),
        jobEdit: () => jobWizard(true),
        jobDetail,
        questionnaires,
        questionnaireDetail,
        applications,
        applicationDetail,
        candidates,
        candidateProfile,
        interviews,
        company,
        notifications,
        settings,
        security,
      };
    try {
      await (handlers[view] || dashboard)();
    } catch (e) {
      console.error(e);
      main().innerHTML = head(t(view || "dashboard")) + errorState();
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();
