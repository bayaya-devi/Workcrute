(() => {
  const role = document.body.dataset.protected;
  if (!role) return;
  const root = location.pathname.startsWith("/Workcrute/") ? "/Workcrute" : "";
  const language = localStorage.getItem("wc_language") || "fr";
  const groups = {
    candidate:[["Tableau de bord","/demandeur/tableau-de-bord"],["Offres","/demandeur/offres"],["Candidatures","/demandeur/candidatures"],["Notifications","/demandeur/notifications"],["Profil","/demandeur/profil"],["Param\u00e8tres","/demandeur/parametres"]],
    recruiter:[["Tableau de bord","/recruteur/tableau-de-bord"],["Mes offres","/recruteur/offres"],["Publier","/recruteur/offres/nouvelle"],["Candidats","/recruteur/candidats"],["Notifications","/recruteur/notifications"],["Entreprise","/recruteur/profil"],["Param\u00e8tres","/recruteur/parametres"]],
    admin:[["Tableau de bord","/admin/tableau-de-bord"],["Demandeurs","/admin/demandeurs"],["Recruteurs","/admin/recruteurs"],["Offres","/admin/offres"],["Candidatures","/admin/candidatures"],["Notifications","/admin/notifications"],["Journal","/admin/journal-activite"],["Param\u00e8tres","/admin/parametres"]]
  };
  const roleLabel={candidate:{fr:"Candidat",en:"Candidate",ar:"\u0645\u0631\u0634\u062d"},recruiter:{fr:"Recruteur",en:"Recruiter",ar:"\u0645\u0633\u0624\u0648\u0644 \u062a\u0648\u0638\u064a\u0641"},admin:{fr:"Administration",en:"Administration",ar:"\u0627\u0644\u0625\u062f\u0627\u0631\u0629"}}[role]?.[language]||role;
  if(language==="ar"){document.documentElement.lang="ar";document.documentElement.dir="rtl";}
  const current=location.pathname.replace(root,"").replace(/\/$/,""),links=groups[role]||[];
  const link=([label,href])=>'<a href="'+root+href+'" data-go="'+href+'"'+(current===href||current.startsWith(href+"/")?' aria-current="page"':"")+'>'+label+'</a>';
  const header=document.createElement("header");
  header.className="app-header";
  header.innerHTML='<a class="brand" href="'+root+'/" data-go="/"><img src="'+root+'/assets/logo-workrute.png" alt="Workcrute"></a><nav class="app-nav" aria-label="Navigation principale">'+links.map(link).join("")+'</nav><div class="app-header-actions"><span class="app-role">'+roleLabel+'</span><select class="language" data-language aria-label="Langue"><option value="fr">FR</option><option value="en">EN</option><option value="ar">AR</option></select><button class="button secondary" data-logout>D\u00e9connexion</button></div>';
  document.body.prepend(header);
  const mobile=document.createElement("nav");mobile.className="mobile-app-nav";mobile.setAttribute("aria-label","Navigation mobile");mobile.innerHTML=links.slice(0,5).map(link).join("");document.body.append(mobile);
  document.addEventListener("click",async event=>{const button=event.target.closest("[data-logout]");if(!button)return;event.preventDefault();button.disabled=true;button.textContent="D\u00e9connexion...";try{await window.workcrute?.api("/api/auth/logout",{method:"POST"});}finally{location.href=root+"/connexion";}});
})();