(() => {
  const i18n = window.workcrutePublicI18n;
  const faq = window.workcruteFaqKnowledge || [];
  const root = location.pathname.startsWith("/Workcrute/") ? "/Workcrute" : "";
  const href = path => `${root}${path === "/" ? "/" : path}`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const t = key => i18n.t(key);

  const header = () => `
    <a class="wc-skip-link" href="#main" data-i18n="skip">${t("skip")}</a>
    <header class="wc-header">
      <div class="wc-container wc-header-inner">
        <a class="wc-brand" data-go="/" href="${href("/")}" aria-label="Workcrute"><img src="${href("/assets/logo-workrute.png")}" alt="Workcrute" width="300" height="96"></a>
        <nav class="wc-nav" data-i18n-aria="main_navigation" aria-label="Navigation principale">
          <a data-go="/" href="${href("/")}" data-nav="home" data-i18n="nav_home">${t("nav_home")}</a>
          <a data-go="/offres" href="${href("/offres")}" data-nav="jobs" data-i18n="nav_jobs">${t("nav_jobs")}</a>
          <a data-go="/candidats" href="${href("/candidats")}" data-nav="candidates" data-i18n="nav_candidates">${t("nav_candidates")}</a>
          <a data-go="/recruteurs" href="${href("/recruteurs")}" data-nav="recruiters" data-i18n="nav_recruiters">${t("nav_recruiters")}</a>
          <a href="${href("/")}#how" data-i18n="nav_how">${t("nav_how")}</a>
          <a data-go="/a-propos" href="${href("/a-propos")}" data-nav="about" data-i18n="nav_about">${t("nav_about")}</a>
        </nav>
        <div class="wc-header-actions">
          <label class="wc-sr-only" for="wc-language" data-i18n="language">${t("language")}</label>
          <select id="wc-language" class="wc-language" data-language><option value="fr">FR</option><option value="en">EN</option><option value="ar">AR</option></select>
          <a class="wc-button wc-button--ghost" data-go="/connexion" href="${href("/connexion")}" data-i18n="sign_in">${t("sign_in")}</a>
          <a class="wc-button wc-button--primary" data-go="/inscription" href="${href("/inscription")}" data-i18n="create_account">${t("create_account")}</a>
          <button class="wc-icon-button wc-menu-button" type="button" data-menu-open data-i18n-aria="menu" aria-expanded="false"><span aria-hidden="true">☰</span></button>
        </div>
      </div>
    </header>
    <div class="wc-mobile-drawer" data-mobile-drawer aria-hidden="true">
      <button class="wc-drawer-backdrop" type="button" data-menu-close data-i18n-aria="close" aria-label="Fermer"></button>
      <aside class="wc-drawer-panel" data-i18n-aria="mobile_navigation" aria-label="Navigation mobile">
        <div class="wc-drawer-head"><a class="wc-brand" data-go="/" href="${href("/")}"><img src="${href("/assets/logo-workrute.png")}" alt="Workcrute"></a><button class="wc-icon-button" type="button" data-menu-close data-i18n-aria="close">×</button></div>
        <nav class="wc-drawer-nav"><a data-go="/" href="${href("/")}" data-i18n="nav_home">${t("nav_home")}</a><a data-go="/offres" href="${href("/offres")}" data-i18n="nav_jobs">${t("nav_jobs")}</a><a data-go="/candidats" href="${href("/candidats")}" data-i18n="nav_candidates">${t("nav_candidates")}</a><a data-go="/recruteurs" href="${href("/recruteurs")}" data-i18n="nav_recruiters">${t("nav_recruiters")}</a><a href="${href("/")}#how" data-i18n="nav_how">${t("nav_how")}</a><a data-go="/a-propos" href="${href("/a-propos")}" data-i18n="nav_about">${t("nav_about")}</a></nav>
        <div class="wc-drawer-actions"><a class="wc-button wc-button--secondary" data-go="/connexion" href="${href("/connexion")}" data-i18n="sign_in">${t("sign_in")}</a><a class="wc-button wc-button--primary" data-go="/inscription" href="${href("/inscription")}" data-i18n="create_account">${t("create_account")}</a></div>
      </aside>
    </div>`;

  const footer = () => `
    <footer class="wc-footer"><div class="wc-container"><div class="wc-footer-grid">
      <div><a class="wc-brand" data-go="/" href="${href("/")}"><img src="${href("/assets/logo-workrute.png")}" alt="Workcrute"></a><p data-i18n="footer_copy">${t("footer_copy")}</p></div>
      <div><h3 data-i18n="footer_candidates">${t("footer_candidates")}</h3><div class="wc-footer-links"><a data-go="/offres" href="${href("/offres")}" data-i18n="footer_jobs">${t("footer_jobs")}</a><a data-go="/inscription/demandeur" href="${href("/inscription/demandeur")}" data-i18n="footer_register">${t("footer_register")}</a></div></div>
      <div><h3 data-i18n="footer_recruiters">${t("footer_recruiters")}</h3><div class="wc-footer-links"><a data-go="/recruteurs" href="${href("/recruteurs")}" data-i18n="nav_recruiters">${t("nav_recruiters")}</a><a data-go="/inscription/recruteur" href="${href("/inscription/recruteur")}" data-i18n="create_account">${t("create_account")}</a></div></div>
      <div><h3 data-i18n="footer_company">${t("footer_company")}</h3><div class="wc-footer-links"><a href="${href("/")}#how" data-i18n="nav_how">${t("nav_how")}</a><a data-go="/a-propos" href="${href("/a-propos")}" data-i18n="nav_about">${t("nav_about")}</a><a data-go="/mentions-legales" href="${href("/mentions-legales")}" data-i18n="footer_legal">${t("footer_legal")}</a></div></div>
      <div><h3 data-i18n="footer_support">${t("footer_support")}</h3><div class="wc-footer-links"><a data-go="/aide" href="${href("/aide")}" data-i18n="footer_help">${t("footer_help")}</a><a data-go="/confidentialite" href="${href("/confidentialite")}" data-i18n="footer_privacy">${t("footer_privacy")}</a><a data-go="/conditions" href="${href("/conditions")}" data-i18n="footer_terms">${t("footer_terms")}</a></div></div>
    </div><div class="wc-footer-bottom"><span>© <span data-year></span> Workcrute. <span data-i18n="footer_rights">${t("footer_rights")}</span></span><span>FR · EN · العربية</span></div></div></footer>`;

  const chatbot = () => `
    <button class="wc-chat-launcher" type="button" data-chat-open data-i18n-aria="open_chat" aria-expanded="false">✦</button>
    <section class="wc-chat" data-chat data-i18n-aria="chat_title" aria-label="Assistant Workcrute" aria-hidden="true">
      <header class="wc-chat-head"><div class="wc-chat-title"><span class="wc-avatar">W</span><span><strong data-i18n="chat_title">${t("chat_title")}</strong><small data-i18n="chat_status">${t("chat_status")}</small></span></div><button class="wc-chat-close" type="button" data-chat-close data-i18n-aria="close">×</button></header>
      <div class="wc-chat-body" data-chat-body aria-live="polite"></div>
      <form class="wc-chat-form" data-chat-form><label class="wc-sr-only" for="wc-chat-input" data-i18n="chat_placeholder">${t("chat_placeholder")}</label><input id="wc-chat-input" class="wc-input" data-chat-input data-i18n-placeholder="chat_placeholder" autocomplete="off"><button class="wc-button wc-button--primary" type="submit" data-i18n="chat_send">${t("chat_send")}</button></form>
    </section>`;

  function injectShell() {
    const headerTarget = document.querySelector("[data-public-header]");
    const footerTarget = document.querySelector("[data-public-footer]");
    const chatTarget = document.querySelector("[data-public-chat]");
    if (headerTarget) headerTarget.outerHTML = header();
    if (footerTarget) footerTarget.outerHTML = footer();
    if (chatTarget) chatTarget.outerHTML = chatbot();
    document.querySelectorAll("[data-year]").forEach(node => node.textContent = new Date().getFullYear());
    const page = document.body.dataset.page;
    document.querySelector(`[data-nav="${page}"]`)?.setAttribute("aria-current", "page");
    i18n.apply();
  }

  function setupNavigation() {
    const drawer = document.querySelector("[data-mobile-drawer]");
    const open = document.querySelector("[data-menu-open]");
    const setOpen = value => { if (!drawer) return; drawer.classList.toggle("is-open", value); drawer.setAttribute("aria-hidden", String(!value)); open?.setAttribute("aria-expanded", String(value)); document.body.style.overflow = value ? "hidden" : ""; };
    open?.addEventListener("click", () => setOpen(true));
    document.querySelectorAll("[data-menu-close]").forEach(button => button.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", event => { if (event.key === "Escape") setOpen(false); });
  }

  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ").replace(/\s+/g, " ").trim();
  const tokenSet = value => new Set(normalize(value).split(" ").filter(token => token.length > 1));
  function scoreFaq(entry, query, language) {
    const suffix = language === "ar" ? "ar" : language === "en" ? "en" : "fr";
    const queryTokens = tokenSet(query);
    const question = entry[`question_${suffix}`];
    const keywords = entry[`keywords_${suffix}`] || [];
    const targetTokens = tokenSet(`${question} ${keywords.join(" ")}`);
    let overlap = 0;
    queryTokens.forEach(token => { if (targetTokens.has(token)) overlap += 1; });
    const phraseBoost = keywords.some(keyword => normalize(query).includes(normalize(keyword))) ? 2 : 0;
    return (overlap + phraseBoost) / Math.max(2, Math.sqrt(queryTokens.size * targetTokens.size));
  }
  function findFaq(query, language = i18n.getLanguage()) {
    return faq.filter(entry => entry.is_active).map(entry => ({ entry, score: scoreFaq(entry, query, language) })).sort((a, b) => b.score - a.score);
  }
  function localized(entry, field, language = i18n.getLanguage()) { return entry[`${field}_${language}`] || entry[`${field}_fr`]; }

  function setupChat() {
    const panel = document.querySelector("[data-chat]");
    const launcher = document.querySelector("[data-chat-open]");
    const body = document.querySelector("[data-chat-body]");
    const form = document.querySelector("[data-chat-form]");
    const input = document.querySelector("[data-chat-input]");
    if (!panel || !body) return;
    let welcomed = false;
    const addMessage = (content, user = false) => { const node = document.createElement("div"); node.className = `wc-message${user ? " wc-message--user" : ""}`; node.textContent = content; body.append(node); body.scrollTop = body.scrollHeight; };
    const suggestions = entries => { const wrap = document.createElement("div"); wrap.className = "wc-chat-suggestions"; entries.forEach(entry => { const button = document.createElement("button"); button.type = "button"; button.className = "wc-chat-suggestion"; button.textContent = localized(entry, "question"); button.addEventListener("click", () => ask(button.textContent)); wrap.append(button); }); body.append(wrap); };
    const welcome = () => { body.innerHTML = ""; addMessage(t("chat_welcome")); suggestions(faq.filter((_, index) => index % 20 === 0).slice(0, 3)); welcomed = true; };
    const ask = query => {
      const clean = query.trim(); if (!clean) return;
      addMessage(clean, true);
      const ranked = findFaq(clean);
      if (ranked[0]?.score >= .38) addMessage(localized(ranked[0].entry, "answer"));
      else { addMessage(t("chat_unknown")); suggestions(ranked.slice(0, 3).map(item => item.entry)); }
    };
    const setOpen = value => { panel.classList.toggle("is-open", value); panel.setAttribute("aria-hidden", String(!value)); launcher.setAttribute("aria-expanded", String(value)); if (value) { if (!welcomed) welcome(); setTimeout(() => input.focus(), 0); } };
    launcher.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
    document.querySelector("[data-chat-close]")?.addEventListener("click", () => setOpen(false));
    form?.addEventListener("submit", event => { event.preventDefault(); ask(input.value); input.value = ""; });
    document.addEventListener("workcrute:language", () => { if (welcomed) welcome(); });
  }

  function faqMarkup(entry) {
    return `<article class="wc-faq-item" data-faq-item data-category="${escapeHtml(entry.category)}"><button class="wc-faq-question" type="button" aria-expanded="false"><span>${escapeHtml(localized(entry, "question"))}</span><span class="wc-faq-toggle" aria-hidden="true">＋</span></button><div class="wc-faq-answer"><p>${escapeHtml(localized(entry, "answer"))}</p></div></article>`;
  }
  function bindAccordions(scope = document) {
    scope.querySelectorAll(".wc-faq-question").forEach(button => button.addEventListener("click", () => { const item = button.closest(".wc-faq-item"); const open = !item.classList.contains("is-open"); item.classList.toggle("is-open", open); button.setAttribute("aria-expanded", String(open)); }));
  }
  function renderFaq() {
    const renderPreviews = () => document.querySelectorAll("[data-faq-preview]").forEach(target => { target.innerHTML = faq.slice(0, 6).map(faqMarkup).join(""); bindAccordions(target); });
    renderPreviews();
    const target = document.querySelector("[data-faq-list]");
    if (!target) { document.addEventListener("workcrute:language", renderPreviews); return; }
    const input = document.querySelector("[data-faq-search]");
    const render = query => {
      const language = i18n.getLanguage();
      const items = query ? findFaq(query, language).filter(item => item.score > .08).slice(0, 30).map(item => item.entry) : faq.slice(0, 30);
      target.innerHTML = items.length ? items.map(faqMarkup).join("") : `<div class="wc-empty"><div class="wc-empty-icon">?</div><h3 data-i18n="no_faq">${t("no_faq")}</h3></div>`;
      bindAccordions(target);
    };
    if (input && !input.dataset.faqBound) { input.dataset.faqBound = "true"; input.addEventListener("input", () => render(input.value)); }
    render("");
    document.addEventListener("workcrute:language", () => { renderPreviews(); render(input?.value || ""); });
  }

  const api = async (path, options) => window.workcrute?.api ? window.workcrute.api(path, options) : fetch(path, options).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; });
  const jobCard = (job, row = false) => {
    const title = escapeHtml(job.title || "—"), company = escapeHtml(job.company_name || t("company_fallback")), city = escapeHtml(job.city || "—"), contract = escapeHtml(job.contract_type || "—"), mode = escapeHtml(job.work_mode || "—");
    const url = href(`/offres/detail?id=${encodeURIComponent(job.id)}`);
    if (row) return `<article class="wc-card wc-job-row"><div><div class="wc-card-row"><span class="wc-company-logo">${company.charAt(0)}</span><div><h3>${title}</h3><p>${company}</p></div></div><div class="wc-job-meta"><span>⌖ ${city}</span><span>${contract}</span><span>${mode}</span></div><p class="wc-muted">${escapeHtml(String(job.description || "").slice(0, 180))}${String(job.description || "").length > 180 ? "…" : ""}</p></div><div class="wc-job-row-actions"><span class="wc-badge">${escapeHtml(job.domain || contract)}</span><a class="wc-button wc-button--primary" href="${url}" data-i18n="view_job">${t("view_job")}</a></div></article>`;
    return `<article class="wc-card wc-job-card"><div class="wc-job-card-head"><div class="wc-card-row"><span class="wc-company-logo">${company.charAt(0)}</span><div><h3>${title}</h3><p>${company}</p></div></div><span class="wc-badge">${contract}</span></div><div class="wc-job-meta"><span>⌖ ${city}</span><span>${mode}</span></div><div class="wc-job-footer"><span class="wc-muted">${t("published")}</span><a href="${url}" data-i18n="view_job">${t("view_job")} →</a></div></article>`;
  };

  async function renderJobs() {
    const preview = document.querySelector("[data-jobs-preview]");
    const list = document.querySelector("[data-jobs-list]");
    if (!preview && !list) return;
    const target = preview || list;
    const searchForm = document.querySelector("[data-job-search]");
    const count = document.querySelector("[data-results-count]");
    const empty = preview
      ? `<div class="wc-empty"><div class="wc-empty-icon">⌕</div><h3>${t("no_jobs")}</h3><p>${t("no_jobs_copy")}</p><a class="wc-button wc-button--secondary" href="${href("/inscription/demandeur")}">${t("create_profile")}</a></div>`
      : `<div class="wc-empty"><div class="wc-empty-icon">⌕</div><h3>${t("empty_jobs_title")}</h3><p>${t("empty_jobs_copy")}</p><a class="wc-button wc-button--secondary" href="${href("/offres")}">${t("reset")}</a></div>`;
    const load = async params => {
      target.setAttribute("aria-busy", "true");
      target.innerHTML = [1,2,3].map(() => `<div class="wc-card wc-card--pad"><div class="wc-skeleton" style="width:65%;height:24px"></div><div class="wc-skeleton" style="margin-top:16px;height:60px"></div></div>`).join("");
      try {
        const result = await api(`/api/jobs${params ? `?${params}` : ""}`);
        const jobs = result.items || [];
        target.innerHTML = jobs.length ? jobs.slice(0, preview ? 6 : 50).map(job => jobCard(job, Boolean(list))).join("") : empty;
        if (count) count.textContent = String(jobs.length);
        const stat = document.querySelector("[data-stat-jobs]"); if (stat) stat.textContent = String(jobs.length);
      } catch { target.innerHTML = `<div class="wc-error-state"><div class="wc-empty-icon">!</div><h3>${t("load_error")}</h3><button class="wc-button wc-button--primary" type="button" data-retry-jobs>${t("retry")}</button></div>`; target.querySelector("[data-retry-jobs]")?.addEventListener("click", () => load(params)); }
      finally { target.removeAttribute("aria-busy"); }
    };
    if (searchForm && !searchForm.dataset.jobsBound) { searchForm.dataset.jobsBound = "true"; searchForm.addEventListener("submit", event => { event.preventDefault(); const data = new FormData(searchForm); const params = new URLSearchParams(); data.forEach((value, key) => { if (value) params.set(key, value); }); load(params.toString()); }); }
    const resetButton = document.querySelector("[data-filter-reset]"); if (resetButton && !resetButton.dataset.jobsBound) { resetButton.dataset.jobsBound = "true"; resetButton.addEventListener("click", () => { searchForm?.reset(); load(""); }); }
    const mobileButton = document.querySelector("[data-filter-mobile]"); if (mobileButton && !mobileButton.dataset.jobsBound) { mobileButton.dataset.jobsBound = "true"; mobileButton.addEventListener("click", () => document.querySelector("[data-filters]")?.classList.toggle("is-open")); }
    await load(new URLSearchParams(location.search).toString());
  }

  async function renderStats() {
    if (!document.querySelector("[data-public-stats]")) return;
    try {
      const { stats = {} } = await api("/api/public/stats");
      [["candidates","[data-stat-candidates]"],["companies","[data-stat-companies]"],["jobs","[data-stat-jobs]"],["applications","[data-stat-applications]"]].forEach(([key, selector]) => { const node = document.querySelector(selector); if (node) node.textContent = Number.isFinite(Number(stats[key])) ? Number(stats[key]).toLocaleString(i18n.getLanguage()) : "—"; });
    } catch { document.querySelectorAll("[data-public-stats] strong").forEach(node => node.textContent = "—"); }
  }

  async function renderJobDetail() {
    const target = document.querySelector("[data-job-detail]");
    if (!target) return;
    const id = new URLSearchParams(location.search).get("id");
    if (!id) { target.innerHTML = `<div class="wc-empty"><h1>${t("job_not_found")}</h1><p>${t("job_not_found_copy")}</p><a class="wc-button wc-button--primary" href="${href("/offres")}">${t("back_jobs")}</a></div>`; return; }
    try {
      const { job } = await api(`/api/jobs/${encodeURIComponent(id)}`);
      const skills = (() => { try { return JSON.parse(job.required_skills || "[]"); } catch { return []; } })();
      target.innerHTML = `<div class="wc-detail-layout"><div class="wc-detail-main"><article class="wc-card wc-detail-section"><div class="wc-card-row"><span class="wc-company-logo">${escapeHtml((job.company_name || "W").charAt(0))}</span><div><span class="wc-badge">${escapeHtml(job.contract_type || "")}</span><h1>${escapeHtml(job.title)}</h1><p class="wc-muted">${escapeHtml(job.company_name || t("company_fallback"))} · ${escapeHtml(job.city || "—")} · ${escapeHtml(job.work_mode || "—")}</p></div></div></article><article class="wc-card wc-detail-section"><h2>${t("job_description")}</h2><p>${escapeHtml(job.description || "—")}</p></article>${job.missions ? `<article class="wc-card wc-detail-section"><h2>${t("job_missions")}</h2><p>${escapeHtml(job.missions)}</p></article>` : ""}${skills.length ? `<article class="wc-card wc-detail-section"><h2>${t("job_skills")}</h2><div class="wc-job-meta">${skills.map(skill => `<span class="wc-badge wc-badge--neutral">${escapeHtml(skill)}</span>`).join("")}</div></article>` : ""}</div><aside class="wc-detail-side"><div class="wc-card wc-detail-actions"><button class="wc-button wc-button--primary wc-button--block" type="button" data-apply-job>${t("apply_now")}</button><button class="wc-button wc-button--secondary wc-button--block" type="button">${t("save")}</button><button class="wc-button wc-button--ghost wc-button--block" type="button" data-share-job>${t("share")}</button><div class="wc-alert"><span>i</span><span>${t("score_unavailable")}</span></div></div></aside></div>`;
      target.querySelector("[data-apply-job]")?.addEventListener("click", async event => { const button = event.currentTarget; button.disabled = true; try { await api("/api/applications", { method:"POST", body:JSON.stringify({ jobId:id }) }); toast(i18n.getLanguage() === "en" ? "Application sent." : i18n.getLanguage() === "ar" ? "تم إرسال الطلب." : "Candidature envoyée.", "success"); } catch (error) { if (/auth|connect/i.test(String(error.message))) location.href = href("/connexion"); else toast(error.message, "error"); } finally { button.disabled = false; } });
      target.querySelector("[data-share-job]")?.addEventListener("click", async () => { try { if (navigator.share) await navigator.share({ title:job.title, url:location.href }); else await navigator.clipboard.writeText(location.href); toast(i18n.getLanguage() === "ar" ? "تم نسخ الرابط." : i18n.getLanguage() === "en" ? "Link copied." : "Lien copié.", "success"); } catch {} });
    } catch { target.innerHTML = `<div class="wc-empty"><h1>${t("job_not_found")}</h1><p>${t("job_not_found_copy")}</p><a class="wc-button wc-button--primary" href="${href("/offres")}">${t("back_jobs")}</a></div>`; }
  }

  function toast(message, kind = "info") {
    let region = document.querySelector(".wc-toast-region"); if (!region) { region = document.createElement("div"); region.className = "wc-toast-region"; region.setAttribute("aria-live", "polite"); document.body.append(region); }
    const node = document.createElement("div"); node.className = `wc-toast wc-toast--${kind}`; node.textContent = message; region.append(node); setTimeout(() => node.remove(), 4200);
  }
  function setupForms() {
    document.querySelectorAll("[data-password-toggle]").forEach(button => { if (button.closest("[data-recruiter-signup]")) return; button.addEventListener("click", () => { const input = button.closest(".wc-password-wrap, .password-field")?.querySelector("input"); if (!input) return; input.type = input.type === "password" ? "text" : "password"; button.textContent = t(input.type === "password" ? "show" : "hide"); }); });
    const heroSearch = document.querySelector("[data-hero-search]");
    heroSearch?.addEventListener("submit", event => { event.preventDefault(); const params = new URLSearchParams(new FormData(heroSearch)); location.href = `${href("/offres")}?${params}`; });
    const wizard = document.querySelector("[data-signup], [data-recruiter-signup]");
    const syncStepLabel = () => {
      if (!wizard) return;
      const steps = [...wizard.querySelectorAll(".step")];
      const active = Math.max(0, steps.findIndex(step => step.classList.contains("active")));
      const label = wizard.querySelector("[data-step-label]");
      if (label) label.textContent = `${t("step")} ${active + 1} ${t("of")} ${steps.length}`;
    };
    wizard?.querySelectorAll("[data-next], [data-back]").forEach(button => button.addEventListener("click", () => setTimeout(syncStepLabel, 0)));
    document.addEventListener("workcrute:language", syncStepLabel);
    syncStepLabel();
  }

  async function init() {
    injectShell(); setupNavigation(); setupChat(); setupForms(); renderFaq();
    await Promise.all([renderJobs(), renderStats(), renderJobDetail()]);
    document.addEventListener("workcrute:language", () => { renderJobs(); renderJobDetail(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.workcrutePublic = { findFaq, toast, renderJobs };
})();
