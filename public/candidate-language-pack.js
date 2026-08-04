(() => {
  const lang = localStorage.getItem('wc_language') || 'fr';
  if (lang === 'fr') return;
  const packs = {
    en: {
      'Vos offres, candidatures et informations importantes.':'Your jobs, applications and important information.',
      'Vos informations professionnelles et vos documents.':'Your professional information and documents.',
      'Langue, confidentialité et préférences de votre compte.':'Language, privacy and account preferences.',
      'Une plateforme de recrutement simple, claire et sécurisée.':'A simple, clear and secure recruitment platform.',
      'Rechercher un métier, une entreprise ou une compétence':'Search for a job, company or skill',
      'Tous les domaines':'All fields','Toutes les villes':'All cities','Aucune offre disponible pour le moment.':'No jobs available at the moment.',
      'Aucune candidature pour le moment.':'No applications yet.','Vous n’avez pas encore de candidature.':'You have no applications yet.',
      'Suivez chaque étape de vos démarches.':'Track every step of your applications.',
      'Vos informations professionnelles et vos documents.':'Your professional information and documents.',
      'Prénom':'First name','Nom':'Last name','Titre professionnel':'Professional title','Présentation':'About you','Ville':'City',
      'Les nouvelles offres et les mises à jour de vos candidatures apparaîtront ici.':'New jobs and application updates will appear here.',
      'Choisissez au moins un critère de recherche.':'Choose at least one search criterion.',
      'Votre alerte a été créée.':'Your alert has been created.','Impossible de créer l’alerte.':'Unable to create the alert.',
      'Création…':'Creating…','Données invalides.':'Invalid data.','Les nouvelles offres et les mises à jour de vos candidatures apparaîtront ici.':'New jobs and application updates will appear here.'
    },
    ar: {
      'Vos offres, candidatures et informations importantes.':'وظائفك وطلباتك ومعلوماتك المهمة.',
      'Vos informations professionnelles et vos documents.':'معلوماتك المهنية ومستنداتك.',
      'Langue, confidentialité et préférences de votre compte.':'اللغة والخصوصية وتفضيلات الحساب.',
      'Une plateforme de recrutement simple, claire et sécurisée.':'منصة توظيف بسيطة وواضحة وآمنة.',
      'Rechercher un métier, une entreprise ou une compétence':'ابحث عن وظيفة أو شركة أو مهارة',
      'Tous les domaines':'كل المجالات','Toutes les villes':'كل المدن','Aucune offre disponible pour le moment.':'لا توجد وظائف متاحة حالياً.',
      'Aucune candidature pour le moment.':'لا توجد طلبات حالياً.','Vous n’avez pas encore de candidature.':'ليس لديك أي طلب بعد.',
      'Suivez chaque étape de vos démarches.':'تابع كل مراحل طلباتك.',
      'Prénom':'الاسم الأول','Nom':'اسم العائلة','Titre professionnel':'المسمى المهني','Présentation':'نبذة عنك','Ville':'المدينة',
      'Les nouvelles offres et les mises à jour de vos candidatures apparaîtront ici.':'ستظهر هنا الوظائف الجديدة وتحديثات طلباتك.',
      'Choisissez au moins un critère de recherche.':'اختر معيار بحث واحداً على الأقل.',
      'Votre alerte a été créée.':'تم إنشاء التنبيه.','Impossible de créer l’alerte.':'تعذر إنشاء التنبيه.',
      'Création…':'جار الإنشاء…','Données invalides.':'بيانات غير صالحة.'
    }
  }[lang] || {};
  const translate = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const nodes=[];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { const key=node.nodeValue.trim(); if (packs[key]) node.nodeValue=node.nodeValue.replace(key,packs[key]); });
    document.querySelectorAll('input,textarea').forEach(field => { if (packs[field.placeholder]) field.placeholder=packs[field.placeholder]; });
    document.querySelectorAll('option').forEach(option => { const key=option.textContent.trim(); if(packs[key]) option.textContent=packs[key]; });
  };
  translate(); new MutationObserver(translate).observe(document.body,{childList:true,subtree:true});
})();
