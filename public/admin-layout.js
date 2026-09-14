(() => {
  const page = document.body.dataset.adminPage || "dashboard";
  const links = [
    ["dashboard", "/admin/tableau-de-bord/", "dashboard", "⌂"],
    ["applicants", "/admin/postulants/", "applicants", "♙"],
    ["employees", "/admin/employes/", "employees", "♜"],
    ["leave", "/admin/conges/", "leave", "◷"],
    ["invoices", "/admin/factures/", "invoices", "▤"],
    ["notifications", "/admin/notifications/", "notifications", "♢"],
    ["settings", "/admin/parametres/", "settings", "⚙"],
    ["security", "/admin/securite/", "security", "◈"],
  ];
  const link = ([id, href, key, icon]) => `<a href="${href}" ${page === id ? 'aria-current="page"' : ""}><span aria-hidden="true">${icon}</span><span data-adm-i18n="${key}">${key}</span>${id === "notifications" ? '<span class="adm-badge" data-admin-unread hidden>0</span>' : ""}</a>`;
  const shell = document.createElement("div");
  shell.innerHTML = `<a class="adm-skip" data-adm-i18n="skip" href="#admin-content">Aller au contenu</a><button class="adm-icon-btn adm-sidebar-toggle" type="button" data-admin-menu data-adm-i18n-aria="navigation" aria-label="Navigation" aria-controls="admin-navigation" aria-expanded="true"><img src="/assets/panel-left.svg" width="20" height="20" alt=""></button><aside class="adm-sidebar" id="admin-navigation"><a class="adm-brand" href="/"><img src="../../assets/logo-workrute.png" alt=""><span>Workcrute</span></a><nav class="adm-nav" aria-label="Administration">${links.map(link).join("")}</nav></aside><div class="adm-main"><header class="adm-topbar"><div class="adm-top-actions"><select class="adm-language" data-admin-language data-adm-i18n-aria="language" aria-label="Langue"><option value="fr">FR</option><option value="en">EN</option><option value="ar">AR</option></select><button class="adm-button primary" data-admin-logout data-adm-i18n="logout">Déconnexion</button></div></header><main class="adm-content" id="admin-content"></main></div><div class="adm-overlay" hidden></div><nav class="adm-bottom" aria-label="Navigation mobile">${links.slice(0, 4).map(link).join("")}</nav>`;
  const content = document.querySelector("template[data-admin-content]");
  document.body.append(...shell.childNodes);
  document.querySelector("#admin-content").append(content.content.cloneNode(true));
  const passwords=document.createElement("script");
  passwords.src="/password-visibility.js";
  document.body.append(passwords);
})();
