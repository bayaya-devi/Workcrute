(() => {
  const root=document.querySelector('[data-admin-billing]');
  if(!root)return;
  const render=()=>window.WorkcruteBilling.adminInvoices(root,window.adminApi,()=>document.documentElement.lang);
  window.addEventListener('admin:language',render);
  render();
})();
