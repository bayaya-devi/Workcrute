(() => {
  if (!document.body.matches('[data-protected="candidate"]')) return;
  const root = location.pathname.startsWith('/Workcrute/') ? '/Workcrute' : '';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const open = event => {
    event.preventDefault(); event.stopImmediatePropagation();
    document.querySelector('.alert-dialog')?.remove();
    const dialog = document.createElement('dialog'); dialog.className = 'alert-dialog';
    dialog.innerHTML = '<form class="panel form" data-alert-form><div class="dialog-heading"><h2>Créer une alerte d’offres</h2><button type="button" class="button secondary" data-alert-close aria-label="Fermer">Fermer</button></div><p>Sélectionnez au moins un critère. Vous serez informé lorsqu’une offre similaire sera publiée.</p><label class="field">Nom de l’alerte<input name="name" value="Mes offres"></label><label class="field">Mots-clés ou métier<input name="keywords"></label><div class="grid-2"><label class="field">Domaine<select name="domain"><option value="">Tous les domaines</option></select></label><label class="field">Ville<input name="city"></label></div><div class="grid-2"><label class="field">Contrat<select name="contractType"><option value="">Indifférent</option><option>CDI</option><option>CDD</option><option>Stage</option><option>Alternance</option><option>Freelance</option></select></label><label class="field">Mode de travail<select name="workMode"><option value="">Indifférent</option><option>Sur place</option><option>Hybride</option><option>À distance</option></select></label></div><div class="grid-2"><label class="field">Fréquence<select name="frequency"><option value="immediate">Immédiatement</option><option value="daily">Résumé quotidien</option><option value="weekly">Résumé hebdomadaire</option></select></label><label class="field">Canal<select name="channel"><option value="both">Application et e-mail</option><option value="app">Application</option><option value="email">E-mail</option></select></label></div><p class="error" role="alert"></p><div class="form-actions"><button type="button" class="button secondary" data-alert-cancel>Annuler</button><button type="submit" class="button primary">Créer l’alerte</button></div></form>';
    document.body.append(dialog); const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelectorAll('[data-alert-close],[data-alert-cancel]').forEach(button => button.addEventListener('click', close));
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.querySelector('[data-alert-form]').addEventListener('submit', async submitEvent => {
      submitEvent.preventDefault(); const form = submitEvent.currentTarget, error = form.querySelector('.error'), button = form.querySelector('[type="submit"]');
      const values = Object.fromEntries(new FormData(form)); if (!values.keywords && !values.domain && !values.city && !values.contractType && !values.workMode) { error.textContent = 'Choisissez au moins un critère de recherche.'; return; }
      button.disabled = true; button.textContent = 'Création…';
      try { await window.workcrute.api('/api/job-alerts', {method:'POST', body:JSON.stringify(values)}); close(); alert('Votre alerte a été créée.'); } catch (err) { error.textContent = err.message || 'Impossible de créer l’alerte.'; button.disabled = false; button.textContent = 'Créer l’alerte'; }
    });
    dialog.showModal(); dialog.querySelector('[name="keywords"]').focus();
  };
  document.addEventListener('click', event => { if (event.target.closest('[data-alert]')) open(event); }, true);
})();
