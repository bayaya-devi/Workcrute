(() => {
  const page = document.body.dataset.adminPage || "dashboard";
  const links = [
    ["dashboard", "/admin/tableau-de-bord/", "dashboard", "⌂"],
    ["applicants", "/admin/postulants/", "applicants", "♙"],
    ["employees", "/admin/employes/", "employees", "♜"],
    ["leave", "/admin/conges/", "leave", "◷"],
    ["notifications", "/admin/notifications/", "notifications", "♢"],
    ["errors", "/admin/erreurs/", "errors", "!"],
    ["settings", "/admin/parametres/", "settings", "⚙"],
    ["security", "/admin/securite/", "security", "◈"],
    ["v2Identity", "/admin/identite-v2/", "v2_identity", "ID"],
  ];
  const link = ([id, href, key, icon]) => `<a href="${href}" ${page === id ? 'aria-current="page"' : ""}><span aria-hidden="true">${icon}</span><span data-adm-i18n="${key}">${key}</span></a>`;
  const shell = document.createElement("div");
  shell.innerHTML = `<a class="adm-skip" href="#admin-content">Aller au contenu</a><aside class="adm-sidebar"><a class="adm-brand" href="/"><img src="../../assets/logo-workrute.png" alt=""><span>Workcrute<small>Control Center</small></span></a><nav class="adm-nav" aria-label="Administration">${links.map(link).join("")}</nav><div class="adm-side-foot"><button class="adm-logout" data-admin-logout data-adm-i18n="logout">Déconnexion</button></div></aside><div class="adm-main"><header class="adm-topbar"><button class="adm-icon-btn adm-menu-btn" data-admin-menu aria-label="Menu">☰</button><div class="adm-search"><input data-admin-search data-adm-i18n-placeholder="search" placeholder="Rechercher…" aria-label="Recherche globale"><kbd>⌘K</kbd><div class="adm-search-results" data-admin-search-results hidden></div></div><div class="adm-top-actions"><select class="adm-language" data-admin-language aria-label="Langue"><option value="fr">FR</option><option value="en">EN</option><option value="ar">AR</option></select><a class="adm-icon-btn" href="/admin/notifications/" aria-label="Notifications">♢<span class="adm-badge" data-admin-unread hidden>0</span></a><div class="adm-user"><span class="adm-avatar">WA</span><span><b data-adm-i18n="administrator">Administrateur</b><small>Control Center</small></span></div></div></header><main class="adm-content" id="admin-content"></main></div><div class="adm-overlay" hidden></div><nav class="adm-bottom" aria-label="Navigation mobile">${links.slice(0, 4).map(link).join("")}</nav>`;
  const content = document.querySelector("template[data-admin-content]");
  document.body.append(...shell.childNodes);
  document.querySelector("#admin-content").append(content.content.cloneNode(true));
})();
