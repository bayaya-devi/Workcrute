(() => {
  const labels = {
    fr: { home: 'Accueil', candidates: 'Pour les candidats', recruiters: 'Pour les recruteurs', auth: 'Me connecter' },
    en: { home: 'Home', candidates: 'For candidates', recruiters: 'For recruiters', auth: 'Sign in' },
    ar: { home: 'الرئيسية', candidates: 'للمترشحين', recruiters: 'للموظفين', auth: 'تسجيل الدخول / إنشاء حساب' },
  };
  const select = document.createElement('select');
  select.id = 'wc-language';
  select.setAttribute('aria-label', 'Langue');
  select.innerHTML = '<option value="fr">Francais</option><option value="ar">Arabe</option><option value="en">English</option>';
  document.querySelector('.actions')?.prepend(select);
  function apply(language) {
    localStorage.setItem('wc_language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    const t = labels[language];
    document.querySelectorAll('[data-public="home"]:not(.brand)').forEach(el => el.textContent = t.home);
    document.querySelectorAll('[data-public="how"]').forEach(el => el.textContent = t.candidates);
    document.querySelectorAll('[data-public="companies"]').forEach(el => el.textContent = t.recruiters);
    document.querySelectorAll('[data-public="login"]').forEach(el => el.textContent = t.auth);
  }
  select.value = localStorage.getItem('wc_language') || 'fr';
  select.addEventListener('change', () => apply(select.value));
  apply(select.value);
})();
