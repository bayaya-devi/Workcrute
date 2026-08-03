(() => {
  const original = window.workcruteApp;
  if (!original) return;
  window.workcruteApp = async (page) => {
    original(page);
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!response.ok) return;
      const data = await response.json();
      const firstName = data.profile?.first_name || data.profile?.firstName || data.user.email.split('@')[0];
      document.querySelector('#aname')?.replaceChildren(firstName);
      document.querySelector('#arole')?.replaceChildren(data.user.role === 'candidate' ? 'Demandeur d’emploi' : 'Recruteur');
      document.querySelectorAll('[data-live-email]').forEach(el => el.textContent = data.user.email);
    } catch (_) {
      // The static shell remains available until the user authenticates.
    }
  };
})();
