(() => {
  const root = location.pathname.startsWith('/Workcrute/') ? '/Workcrute' : '';
  const supported = new Set(['fr','en','ar']);
  const readCookie = name => document.cookie.match(new RegExp('(?:^|; )'+name.replace(/[.$?*|{}()\[\]\\/+^]/g,'\\$&')+'=([^;]*)'))?.[1];
  const initial = localStorage.getItem('wc_language') || decodeURIComponent(readCookie('wc_language') || '') || (navigator.language || 'fr').slice(0,2);
  let language = supported.has(initial) ? initial : 'fr';
  let messages = {};
  const get = (path, values = {}) => path.split('.').reduce((value,key) => value && value[key], messages) || path;
  const t = (path, values) => String(get(path, values)).replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? '');
  const applyDocumentLanguage = () => { document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; document.documentElement.dataset.locale = language; };
  const load = async lang => { const response = await fetch(root+'/locales/'+lang+'.json', {cache:'no-cache'}); if (!response.ok) throw new Error('Locale unavailable'); messages = await response.json(); language = lang; applyDocumentLanguage(); return messages; };
  const persist = async lang => { localStorage.setItem('wc_language',lang); document.cookie='wc_language='+encodeURIComponent(lang)+'; Path=/; Max-Age=31536000; SameSite=Lax'; if (window.workcrute?.api && document.body.dataset.protected) await window.workcrute.api('/api/profile',{method:'PATCH',body:JSON.stringify({language:lang})}).catch(() => {}); };
  const setLanguage = async lang => { if (!supported.has(lang)) return; await load(lang); await persist(lang); document.dispatchEvent(new CustomEvent('workcrute:languagechange',{detail:{language:lang}})); };
  const ready = load(language).catch(async () => { language='fr'; messages={}; applyDocumentLanguage(); });
  window.workcruteI18n = {ready,t,getLanguage:() => language,setLanguage};
})();
