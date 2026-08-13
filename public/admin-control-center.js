(() => {
  const api = async (path, options = {}) => {
    const response = await fetch(path, { credentials:"same-origin", ...options, headers:{...(options.body ? {"content-type":"application/json"} : {}),...options.headers} });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { location.replace("/admin/connexion/"); throw new Error("Session expirée"); }
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    return data;
  };
  window.adminApi = api;
  const sidebar = document.querySelector(".adm-sidebar");
  const overlay = document.querySelector(".adm-overlay");
  const toggle = (open) => { sidebar?.classList.toggle("open", open); if (overlay) overlay.hidden = !open; };
  document.querySelector("[data-admin-menu]")?.addEventListener("click", () => toggle(!sidebar.classList.contains("open")));
  overlay?.addEventListener("click", () => toggle(false));
  document.querySelector("[data-admin-logout]")?.addEventListener("click", async () => { try { await api("/api/admin/auth/logout", { method:"POST" }); } finally { location.replace("/admin/connexion/"); } });
  const search = document.querySelector("[data-admin-search]");
  const results = document.querySelector("[data-admin-search-results]");
  let timer;
  search?.addEventListener("input", () => {
    clearTimeout(timer);
    const query = search.value.trim();
    if (query.length < 2) { results.hidden = true; results.replaceChildren(); return; }
    timer = setTimeout(async () => {
      try {
        const data = await api(`/api/admin/search?q=${encodeURIComponent(query)}`);
        results.replaceChildren(...(data.items.length ? data.items.map((item) => {
          const link = document.createElement("a"); link.href = item.href; link.textContent = `${item.label} · ${item.type}`; return link;
        }) : [Object.assign(document.createElement("span"), { className:"adm-search-empty", textContent:"Aucun résultat" })]));
        results.hidden = false;
      } catch { results.hidden = true; }
    }, 250);
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); search?.focus(); }
    if (event.key === "Escape") { if (results) results.hidden = true; toggle(false); }
  });
  api("/api/admin/auth/me").then((data) => {
    document.querySelectorAll("[data-admin-unread]").forEach((node) => { node.textContent = data.unreadNotifications; node.hidden = !data.unreadNotifications; });
    document.dispatchEvent(new CustomEvent("admin:ready", { detail:data }));
  }).catch(() => {});
})();
