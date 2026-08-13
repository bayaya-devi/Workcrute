(() => {
  const api = window.adminApi,
    state = { items: [], categories: [], analytics: null, editing: null },
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
      );
  const toast = (m, e = false) => {
    const n = document.querySelector("[data-chat-toast]");
    n.textContent = m;
    n.classList.toggle("error", e);
    n.hidden = false;
    setTimeout(() => (n.hidden = true), 3000);
  };
  const fields = (lang) =>
    `<fieldset class="adm-language-group"><legend>${lang.toUpperCase()}</legend><label class="adm-field"><span>Question</span><input class="adm-input" name="question${lang[0].toUpperCase() + lang.slice(1)}" required ${lang === "ar" ? 'dir="rtl"' : ""}></label><label class="adm-field"><span>Réponse</span><textarea class="adm-input" name="answer${lang[0].toUpperCase() + lang.slice(1)}" required ${lang === "ar" ? 'dir="rtl"' : ""}></textarea></label><label class="adm-field"><span>Mots-clés (séparés par des virgules)</span><input class="adm-input" name="keywords${lang[0].toUpperCase() + lang.slice(1)}" ${lang === "ar" ? 'dir="rtl"' : ""}></label></fieldset>`;
  document.querySelector("[data-faq-languages]").innerHTML = ["fr", "en", "ar"]
    .map(fields)
    .join("");
  function fillCategories() {
    document.querySelectorAll('select[name="category"]').forEach((s, i) => {
      const first =
        i === 0 ? '<option value="">Toutes les catégories</option>' : "";
      s.innerHTML =
        first +
        state.categories
          .map((c) => `<option value="${c}">${c}</option>`)
          .join("");
    });
  }
  function renderFaq() {
    const root = document.querySelector("[data-faq-list]");
    root.innerHTML = `<div class="adm-list-head"><p>${state.items.length} FAQ</p></div><div class="adm-table-wrap"><table class="adm-table adm-business-table"><thead><tr><th>Question FR</th><th>Catégorie</th><th>Priorité</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${state.items.map((x) => `<tr><td data-label="Question"><strong>${esc(x.question_fr)}</strong><small class="adm-block-muted">${esc(x.question_en)}</small></td><td data-label="Catégorie">${x.category}</td><td data-label="Priorité">${x.priority}</td><td data-label="Statut"><span class="adm-pill ${x.is_active ? "success" : ""}">${x.is_active ? "Actif" : "Inactif"}</span></td><td class="adm-row-actions" data-label="Actions"><button class="adm-row-action" data-edit="${x.id}">Modifier</button><button class="adm-row-action" data-toggle="${x.id}">${x.is_active ? "Désactiver" : "Activer"}</button><button class="adm-row-action danger" data-delete="${x.id}">Supprimer</button></td></tr>`).join("")}</tbody></table></div>`;
  }
  async function loadFaq() {
    const f = document.querySelector("[data-faq-filters]"),
      p = new URLSearchParams(new FormData(f)),
      d = await api(`/api/admin/faq?${p}`);
    state.items = d.items;
    state.categories = d.categories;
    fillCategories();
    renderFaq();
  }
  async function loadAnalytics() {
    const d = await api("/api/admin/chatbot/analytics");
    state.analytics = d;
    document.querySelector("[data-chat-stats]").innerHTML = [
      ["Questions", d.summary.total],
      ["Réponses", d.summary.answered],
      ["Taux de réponse", `${d.summary.responseRate}%`],
      ["Non comprises", d.unknown.length],
    ]
      .map(
        ([k, v]) =>
          `<article class="adm-card adm-dashboard-stat"><span>${k}</span><strong>${v}</strong></article>`,
      )
      .join("");
    document.querySelector("[data-top-questions]").innerHTML = d.topQuestions
      .length
      ? d.topQuestions
          .map(
            (x) =>
              `<div class="adm-event"><strong>${esc(x.question_fr)}</strong><span>${x.count}</span></div>`,
          )
          .join("")
      : "Aucune donnée.";
    document.querySelector("[data-breakdown]").innerHTML = [
      ...d.categories.map((x) => `${esc(x.category)} : ${x.count}`),
      ...d.languages.map((x) => `${x.language.toUpperCase()} : ${x.count}`),
    ]
      .map((x) => `<p>${x}</p>`)
      .join("");
    document.querySelector("[data-unknown-list]").innerHTML = d.unknown.length
      ? `<div class="adm-table-wrap"><table class="adm-table adm-business-table"><thead><tr><th>Question</th><th>Langue</th><th>Score</th><th>Action</th></tr></thead><tbody>${d.unknown.map((x) => `<tr><td data-label="Question">${esc(x.query_text)}</td><td data-label="Langue">${x.language.toUpperCase()}</td><td data-label="Score">${Math.round(x.score * 100)}%</td><td data-label="Action"><button class="adm-row-action" data-convert="${x.id}" ${x.converted_faq_id ? "disabled" : ""}>${x.converted_faq_id ? "Transformée" : "Transformer en FAQ"}</button></td></tr>`).join("")}</tbody></table></div>`
      : "<div class='adm-empty'>Aucune question non comprise.</div>";
  }
  function openForm(item = null) {
    state.editing = item;
    const f = document.querySelector("[data-faq-form]");
    f.reset();
    f.elements.id.value = item?.id || "";
    f.elements.category.value = item?.category || "support";
    f.elements.priority.value = item?.priority ?? 50;
    f.elements.active.checked = item ? item.is_active : true;
    for (const lang of ["Fr", "En", "Ar"]) {
      f.elements[`question${lang}`].value =
        item?.[`question_${lang.toLowerCase()}`] || "";
      f.elements[`answer${lang}`].value =
        item?.[`answer_${lang.toLowerCase()}`] || "";
      f.elements[`keywords${lang}`].value = (
        item?.[`keywords_${lang.toLowerCase()}`] || []
      ).join(", ");
    }
    document.querySelector("[data-faq-dialog]").showModal();
  }
  document.querySelector("[data-new-faq]").onclick = () => openForm();
  document
    .querySelectorAll("[data-close-faq]")
    .forEach(
      (b) =>
        (b.onclick = () => document.querySelector("[data-faq-dialog]").close()),
    );
  document.querySelector("[data-faq-filters]").onsubmit = (e) => {
    e.preventDefault();
    loadFaq().catch((x) => toast(x.message, true));
  };
  document.querySelector("[data-faq-form]").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.submitter;
    if (b.disabled) return;
    b.disabled = true;
    const raw = Object.fromEntries(new FormData(e.currentTarget)),
      payload = {
        ...raw,
        priority: Number(raw.priority),
        active: e.currentTarget.elements.active.checked,
      };
    for (const lang of ["Fr", "En", "Ar"])
      payload[`keywords${lang}`] = raw[`keywords${lang}`]
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    try {
      await api(
        `/api/admin/faq${state.editing ? `/${state.editing.id}` : ""}`,
        {
          method: state.editing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      document.querySelector("[data-faq-dialog]").close();
      toast("Enregistré.");
      await loadFaq();
    } catch (x) {
      toast(x.message, true);
    } finally {
      b.disabled = false;
    }
  };
  document.addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit]"),
      toggle = e.target.closest("[data-toggle]"),
      del = e.target.closest("[data-delete]"),
      convert = e.target.closest("[data-convert]");
    try {
      if (edit)
        return openForm(state.items.find((x) => x.id === edit.dataset.edit));
      if (toggle) {
        await api(`/api/admin/faq/${toggle.dataset.toggle}/toggle`, {
          method: "POST",
          body: "{}",
        });
        return loadFaq();
      }
      if (del && confirm("Suppression définitive ?")) {
        await api(`/api/admin/faq/${del.dataset.delete}`, { method: "DELETE" });
        return loadFaq();
      }
      if (convert) {
        const d = await api(
          `/api/admin/chatbot/unknown/${convert.dataset.convert}/convert`,
          { method: "POST", body: "{}" },
        );
        await loadFaq();
        openForm(state.items.find((x) => x.id === d.id));
        await loadAnalytics();
      }
    } catch (x) {
      toast(x.message, true);
    }
  });
  document.querySelectorAll("[data-chat-tab]").forEach(
    (b) =>
      (b.onclick = async () => {
        document
          .querySelectorAll("[data-chat-tab]")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        for (const key of ["faq", "analytics", "unknown"])
          document.querySelector(`[data-${key}-panel]`).hidden =
            key !== b.dataset.chatTab;
        if (b.dataset.chatTab !== "faq") await loadAnalytics();
      }),
  );
  loadFaq().catch((x) => toast(x.message, true));
})();
