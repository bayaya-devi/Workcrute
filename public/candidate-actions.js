(() => {
  if (!document.body.matches('[data-protected="candidate"]')) return;
  const enhance = () => {
    const form = document.querySelector('[data-profile-form]');
    if (form && !form.dataset.enhanced) {
      const field = form.querySelector('[name="availability"]');
      if (field && field.tagName === 'INPUT') {
        const select = document.createElement('select');
        select.name = 'availability';
        select.innerHTML = '<option value="immediate">Immédiatement</option><option value="one_month">Dans 1 mois</option><option value="two_months">Dans 2 mois</option><option value="other">Autre</option>';
        const current = field.value || 'immediate';
        select.value = ['immediate','one_month','two_months','other'].includes(current) ? current : 'other';
        field.replaceWith(select);
        const detail = document.createElement('label');
        detail.className = 'field'; detail.dataset.availabilityDetail = '';
        detail.innerHTML = '<span>Précisez votre disponibilité</span><input name="availabilityDetail" placeholder="Ex. À partir de septembre">';
        select.closest('.field').after(detail);
        const sync = () => { detail.hidden = select.value !== 'other'; };
        select.addEventListener('change', sync); sync();
      }
      form.dataset.enhanced = 'true';
    }
    const docs = document.querySelector('.panel h2')?.textContent === 'Documents' ? document.querySelector('.panel h2').parentElement?.parentElement : null;
    if (docs && !docs.querySelector('[data-document-drop]')) {
      const upload = document.createElement('form'); upload.className = 'dropzone document-drop'; upload.dataset.documentDrop = 'true';
      upload.innerHTML = '<label>Glissez un fichier PDF, Word ou DOCX ici<input required type="file" name="file" accept=".pdf,.doc,.docx"></label><select name="kind"><option value="cv">CV</option><option value="cover_letter">Lettre de motivation</option></select><button class="button secondary" type="submit">Ajouter un document</button>';
      docs.append(upload);
      upload.addEventListener('submit', async event => { event.preventDefault(); const button = upload.querySelector('button'); button.disabled = true; const formData = new FormData(upload); try { if (location.hostname.endsWith('github.io')) await window.workcruteLocalApi.uploadDocument(formData); else await fetch('/api/documents', { method:'POST', credentials:'same-origin', body:formData }); location.reload(); } finally { button.disabled = false; } });
    }
  };
  new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
  enhance();
})();
