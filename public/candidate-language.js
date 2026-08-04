(() => {
  const language = localStorage.getItem('wc_language') || 'fr';
  const translations = {
    en: {'Tableau de bord':'Dashboard','Offres':'Jobs','Candidatures':'Applications','Notifications':'Notifications','Profil':'Profile','Paramètres':'Settings','Candidat':'Candidate','Déconnexion':'Log out','Mon profil':'My profile','Mes candidatures':'My applications','Aucune notification pour l’instant':'No notifications for now'},
    ar: {'Tableau de bord':'لوحة التحكم','Offres':'الوظائف','Candidatures':'الترشيحات','Notifications':'الإشعارات','Profil':'الملف الشخصي','Paramètres':'الإعدادات','Candidat':'مرشح','Déconnexion':'تسجيل الخروج','Mon profil':'ملفي الشخصي','Mes candidatures':'ترشيحاتي','Aucune notification pour l’instant':'لا توجد إشعارات حالياً'}
  }[language] || {};
  document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  if (!Object.keys(translations).length) return;
  const translate = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { const value = node.nodeValue.trim(); if (translations[value]) node.nodeValue = node.nodeValue.replace(value, translations[value]); });
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(field => { if (translations[field.placeholder]) field.placeholder = translations[field.placeholder]; });
  };
  translate(); new MutationObserver(translate).observe(document.body, {childList:true, subtree:true});
})();
