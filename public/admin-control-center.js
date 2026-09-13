(() => {
  const api = async (path, options = {}) => {
    const language=document.documentElement.lang;
    const messages={fr:{network:"Connexion réseau indisponible.",401:"Session expirée.",422:"Vérifiez les champs obligatoires.",409:"Cette action est incompatible avec l’état actuel des données.",other:"L’action n’a pas pu être effectuée."},en:{network:"Network connection unavailable.",401:"Session expired.",422:"Check the required fields.",409:"This action conflicts with the current data.",other:"The action could not be completed."},ar:{network:"الاتصال بالشبكة غير متاح.",401:"انتهت الجلسة.",422:"تحقق من الحقول الإلزامية.",409:"يتعارض هذا الإجراء مع البيانات الحالية.",other:"تعذّر تنفيذ الإجراء."}};
    let response;try{response = await fetch(path, { credentials:"same-origin", ...options, headers:{...(options.body ? {"content-type":"application/json"} : {}),...options.headers} });}catch(error){throw (window.WorkcruteErrors?.networkError()||error);}
    const data = await response.json().catch(() => ({}));
    if (!response.ok && language!=="fr") data.userMessage=(messages[language]||messages.fr)[response.status] || (messages[language]||messages.fr).other;
    if(response.status===401)location.replace('/connexion/');
    if (response.status === 401) { window.WorkcruteErrors?.sessionExpired(); throw Object.assign(new Error(data.userMessage || "Session expirée"),{status:401,requestId:data.requestId,code:data.code}); }
    if (!response.ok) throw (window.WorkcruteErrors?.apiError(response,data)||Object.assign(new Error(data.userMessage||data.error||"Une erreur est survenue."),{status:response.status,requestId:data.requestId,code:data.code}));
    return data;
  };
  window.adminApi = api;
  const sidebar = document.querySelector(".adm-sidebar");
  const overlay = document.querySelector(".adm-overlay");
  const menu = document.querySelector("[data-admin-menu]");
  const mobile = () => matchMedia("(max-width: 850px)").matches;
  const toggle = (open) => {
    sidebar?.classList.toggle("open", open);
    document.body.classList.toggle("adm-nav-collapsed", !open);
    sidebar.inert = !open;
    menu?.setAttribute("aria-expanded", String(open));
    if (overlay) overlay.hidden = !open || !mobile();
    document.body.style.overflow = open && mobile() ? "hidden" : "";
    document.querySelector('.adm-main').inert=open&&mobile();
    document.querySelector('.adm-bottom').inert=open&&mobile();
  };
  toggle(!mobile());
  menu?.addEventListener("click", () => toggle(menu.getAttribute("aria-expanded") !== "true"));
  matchMedia("(max-width: 850px)").addEventListener("change", () => toggle(!mobile()));
  sidebar?.addEventListener("click", event => { if (mobile() && event.target.closest("a")) toggle(false); });
  overlay?.addEventListener("click", () => toggle(false));
  document.querySelector("[data-admin-logout]")?.addEventListener("click", async event => {
    const button=event.currentTarget;if(button.disabled)return;button.disabled=true;
    const results=await Promise.allSettled([api('/api/v2/auth/logout',{method:'POST'}),api('/api/admin/auth/logout',{method:'POST'})]);
    if(results.every(result=>result.status==='fulfilled'))location.replace('/connexion/');
    else {button.disabled=false;const node=document.createElement('p');node.className='adm-error';node.setAttribute('role','alert');node.textContent=workcruteAdminI18n.messages[document.documentElement.lang].logout_error;document.querySelector('#admin-content').prepend(node);}
  });
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
    if(event.key==='Tab'&&mobile()&&menu.getAttribute('aria-expanded')==='true'){
      const controls=[menu,...sidebar.querySelectorAll('a,button,select')],first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); search?.focus(); }
    if (event.key === "Escape") { if (results) results.hidden = true; toggle(false); menu?.focus(); }
  });
  api("/api/admin/auth/me").then((data) => {
    document.querySelectorAll("[data-admin-unread]").forEach((node) => { node.textContent = data.unreadNotifications; node.hidden = !data.unreadNotifications; });
    document.dispatchEvent(new CustomEvent("admin:ready", { detail:data }));
  }).catch(() => {});
})();
