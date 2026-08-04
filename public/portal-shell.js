(() => {
  const role = document.body.dataset.protected;
  if (!role) return;
  const root = location.pathname.startsWith('/Workcrute/') ? '/Workcrute' : '';
  const groups = {
    candidate: [
      ['Tableau de bord', '/demandeur/tableau-de-bord'], ['Offres', '/demandeur/offres'], ['Candidatures', '/demandeur/candidatures'], ['Notifications', '/demandeur/notifications'], ['Profil', '/demandeur/profil'], ['Paramètres', '/demandeur/parametres']
    ],
    recruiter: [
      ['Tableau de bord', '/recruteur/tableau-de-bord'], ['Mes offres', '/recruteur/offres'], ['Publier', '/recruteur/offres/nouvelle'], ['Candidats', '/recruteur/candidats'], ['Notifications', '/recruteur/notifications'], ['Entreprise', '/recruteur/profil'], ['Paramètres', '/recruteur/parametres']
    ],
    admin: [
      ['Tableau de bord', '/admin/tableau-de-bord'], ['Demandeurs', '/admin/demandeurs'], ['Recruteurs', '/admin/recruteurs'], ['Offres', '/admin/offres'], ['Candidatures', '/admin/candidatures'], ['Notifications', '/admin/notifications'], ['Journal', '/admin/journal-activite'], ['Paramètres', '/admin/parametres']
    ]
  };
  const links = groups[role] || [];
  const current = location.pathname.replace(root, '').replace(/\/$/, '');
  const active = href => current === href || current.startsWith(href + '/') ? ' aria-current="page"' : '';
  const link = ([label, href]) => '<a href="'+root+href+'" data-go="'+href+'"'+active(href)+'>'+label+'</a>';
  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = '<a class="brand" href="'+root+'/" data-go="/"><img src="'+root+'/assets/logo-workrute.png" alt="Workcrute"></a><nav class="app-nav" aria-label="Navigation principale">'+links.map(link).join('')+'</nav><div class="app-header-actions"><span class="app-role">'+role+'</span><select class="language" data-language aria-label="Langue"><option value="fr">FR</option><option value="en">EN</option><option value="ar">AR</option></select><button class="button secondary" data-logout>Déconnexion</button></div>';
  document.body.prepend(header);
  const mobile = document.createElement('nav');
  mobile.className = 'mobile-app-nav'; mobile.setAttribute('aria-label', 'Navigation mobile');
  mobile.innerHTML = links.slice(0, 5).map(link).join(''); document.body.append(mobile);
})();
