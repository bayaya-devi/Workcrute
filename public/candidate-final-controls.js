(() => {
  if (!document.body.matches('[data-protected="candidate"]')) return;
  const api = () => window.workcrute?.api;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const date = value => new Intl.DateTimeFormat(document.documentElement.lang || 'fr', {dateStyle:'medium'}).format(new Date(value));
  let rendering = false;
  const renderNotifications = async () => {
    if (rendering) return;
    rendering = true;
    const call = api(); if (!call) return;
    const response = await call('/api/notifications');
    const items = response.notifications || response || [];
    const target = document.querySelector('.notification-list'); if (!target) return;
    target.innerHTML = items.length ? items.map(item => {
      const unread = !item.read_at && !item.is_read;
      return '<article class="panel notification-row '+(unread?'notice':'')+'"><div><h2>'+escape(item.title)+'</h2><p>'+escape(item.body)+'</p><small>'+date(item.created_at || Date.now())+'</small></div><div class="notification-actions"><button class="icon-button" data-note-toggle="'+escape(item.id)+'" aria-label="'+(unread?'Marquer comme lu':'Marquer comme non lu')+'">'+(unread?'Lu':'Non lu')+'</button><button class="icon-button danger" data-note-delete="'+escape(item.id)+'" aria-label="Supprimer la notification">×</button></div></article>';
    }).join('') : '<div class="empty-state"><h2>Aucune notification pour l’instant</h2><p>Les nouvelles offres et les mises à jour de vos candidatures apparaîtront ici.</p></div>';
  };
  document.addEventListener('click', async event => {
    const toggle = event.target.closest('[data-note-toggle]');
    const remove = event.target.closest('[data-note-delete]');
    const navigation = event.target.closest('[data-go]');
    if (toggle) { event.preventDefault(); await api()('/api/notifications/'+toggle.dataset.noteToggle, {method:'PATCH', body:JSON.stringify({read:toggle.textContent.trim() === 'Lu'})}); await renderNotifications(); }
    if (remove) { event.preventDefault(); await api()('/api/notifications/'+remove.dataset.noteDelete, {method:'DELETE'}); await renderNotifications(); }
    if (navigation) { event.preventDefault(); const root = location.pathname.startsWith('/Workcrute/') ? '/Workcrute' : ''; location.href = root + navigation.dataset.go; }
  });
  document.addEventListener('change', async event => {
    const select = event.target.closest('[data-setting-language],[data-language-setting]');
    if (!select || !api()) return;
    localStorage.setItem('wc_language', select.value);
    document.cookie = 'wc_language='+encodeURIComponent(select.value)+'; path=/; max-age=31536000; SameSite=Lax';
    await api()('/api/profile', {method:'PATCH', body:JSON.stringify({language:select.value})}).catch(() => {});
    document.documentElement.lang = select.value;
    document.documentElement.dir = select.value === 'ar' ? 'rtl' : 'ltr';
    location.reload();
  });
  const observer = new MutationObserver(() => { if (document.body.dataset.candidateView === 'notifications') renderNotifications().catch(() => {}); });
  observer.observe(document.body, {childList:true, subtree:true});
  setTimeout(() => { if (document.body.dataset.candidateView === 'notifications') renderNotifications().catch(() => {}); }, 250);
})();
