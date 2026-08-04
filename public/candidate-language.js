(() => {
  const supported = ['fr','en','ar'];
  const saved = localStorage.getItem('wc_language') || '';
  const apply = language => {
    const lang = supported.includes(language) ? language : 'fr';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('wc_language', lang);
    document.cookie = 'wc_language=' + encodeURIComponent(lang) + '; path=/; max-age=31536000; SameSite=Lax';
    return lang;
  };
  const lang = apply(saved || 'fr');
  const dictionaries = {
    en: {
      'Tableau de bord':'Dashboard','Offres':'Jobs','Candidatures':'Applications','Notifications':'Notifications','Profil':'Profile','Paramètres':'Settings','Candidat':'Candidate','Déconnexion':'Log out','Mon profil':'My profile','Mes candidatures':'My applications','Offres d’emploi':'Job offers','Dernières notifications':'Latest notifications','Candidatures envoyées':'Applications sent','Recruteurs ayant vu le profil':'Recruiters who viewed your profile','En attente':'Pending','En cours':'In progress','Notifications non lues':'Unread notifications','Profil complété':'Profile completed','Bienvenue,':'Welcome,','Action prioritaire':'Next step','Voir toutes les notifications':'View all notifications','Compléter mon profil':'Complete my profile','Détails de votre compte':'Your account details','Disponibilité':'Availability','Immédiatement':'Immediately','Dans 1 mois':'In 1 month','Dans 2 mois':'In 2 months','Autre':'Other','Précisez votre disponibilité':'Specify your availability','Documents':'Documents','Ajouter un document':'Add a document','Glissez un fichier PDF, Word ou DOCX ici':'Drag a PDF, Word or DOCX file here','Enregistrer':'Save','Langue':'Language','Recevoir les notifications dans l’application':'Receive in-app notifications','Recevoir les alertes par e-mail':'Receive email alerts','Tout marquer comme lu':'Mark all as read','Créer une alerte':'Create a job alert','Créer une alerte d’offres':'Create a job alert','Fermer':'Close','Annuler':'Cancel','Créer l’alerte':'Create alert','Nom de l’alerte':'Alert name','Mots-clés ou métier':'Keywords or job title','Domaine':'Field','Ville':'City','Contrat':'Contract','Mode de travail':'Work mode','Fréquence':'Frequency','Canal':'Channel','Indifférent':'Any','Résumé quotidien':'Daily summary','Résumé hebdomadaire':'Weekly summary','Application et e-mail':'App and email','Application':'App','E-mail':'Email','Aucune notification pour l’instant':'No notifications for now','Aucune notification pour le moment':'No notifications for now','Aucun document ajouté.':'No document added.'
    },
    ar: {
      'Tableau de bord':'لوحة التحكم','Offres':'الوظائف','Candidatures':'الطلبات','Notifications':'الإشعارات','Profil':'الملف الشخصي','Paramètres':'الإعدادات','Candidat':'مرشح','Déconnexion':'تسجيل الخروج','Mon profil':'ملفي الشخصي','Mes candidatures':'طلباتي','Offres d’emploi':'الوظائف','Dernières notifications':'آخر الإشعارات','Candidatures envoyées':'الطلبات المرسلة','Recruteurs ayant vu le profil':'المسؤولون الذين شاهدوا الملف','En attente':'قيد الانتظار','En cours':'قيد المعالجة','Notifications non lues':'إشعارات غير مقروءة','Profil complété':'اكتمال الملف','Bienvenue,':'مرحباً،','Action prioritaire':'الخطوة التالية','Voir toutes les notifications':'عرض كل الإشعارات','Compléter mon profil':'إكمال الملف الشخصي','Disponibilité':'التوفر','Immédiatement':'فوراً','Dans 1 mois':'خلال شهر','Dans 2 mois':'خلال شهرين','Autre':'أخرى','Précisez votre disponibilité':'حدد موعد التوفر','Documents':'المستندات','Ajouter un document':'إضافة مستند','Glissez un fichier PDF, Word ou DOCX ici':'اسحب ملف PDF أو Word أو DOCX هنا','Enregistrer':'حفظ','Langue':'اللغة','Recevoir les notifications dans l’application':'تلقي إشعارات التطبيق','Recevoir les alertes par e-mail':'تلقي التنبيهات عبر البريد الإلكتروني','Tout marquer comme lu':'تحديد الكل كمقروء','Créer une alerte':'إنشاء تنبيه للوظائف','Créer une alerte d’offres':'إنشاء تنبيه للوظائف','Fermer':'إغلاق','Annuler':'إلغاء','Créer l’alerte':'إنشاء التنبيه','Nom de l’alerte':'اسم التنبيه','Mots-clés ou métier':'الكلمات المفتاحية أو المهنة','Domaine':'المجال','Ville':'المدينة','Contrat':'نوع العقد','Mode de travail':'نظام العمل','Fréquence':'التكرار','Canal':'القناة','Indifférent':'أي خيار','Résumé quotidien':'ملخص يومي','Résumé hebdomadaire':'ملخص أسبوعي','Application et e-mail':'التطبيق والبريد الإلكتروني','Application':'التطبيق','E-mail':'البريد الإلكتروني','Aucune notification pour l’instant':'لا توجد إشعارات حالياً','Aucune notification pour le moment':'لا توجد إشعارات حالياً','Aucun document ajouté.':'لم تتم إضافة أي مستند.'
    }
  };
  const dictionary = dictionaries[lang] || {};
  const translate = () => {
    if (!Object.keys(dictionary).length) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const value = node.nodeValue.trim();
      if (dictionary[value]) node.nodeValue = node.nodeValue.replace(value, dictionary[value]);
    });
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(field => {
      if (dictionary[field.placeholder]) field.placeholder = dictionary[field.placeholder];
    });
  };
  translate();
  new MutationObserver(translate).observe(document.body, {childList:true, subtree:true});
  window.workcruteLanguage = {apply, current:() => lang};
})();