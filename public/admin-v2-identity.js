(() => {
  const form = document.querySelector("[data-v2-admin-account]");
  if (!form || !window.adminApi) return;
  const state = document.querySelector("[data-v2-admin-state]");
  const error = document.querySelector("[data-v2-admin-error]");
  const messages={fr:{configured:"Votre identité est configurée. Laissez le nouveau mot de passe vide pour le conserver. Enregistrer révoque les sessions actives.",empty:"Aucune identité V2 n’est encore configurée.",mismatch:"Les mots de passe ne correspondent pas.",saved:"Identité V2 enregistrée. Utilisez désormais la page de connexion publique."},en:{configured:"Your identity is configured. Leave the new password blank to keep it. Saving revokes active sessions.",empty:"No V2 identity has been configured yet.",mismatch:"Passwords do not match.",saved:"V2 identity saved. You can now use the public sign-in page."},ar:{configured:"تم إعداد الهوية. اترك كلمة المرور الجديدة فارغة للاحتفاظ بها. يؤدي الحفظ إلى إلغاء الجلسات النشطة.",empty:"لم يتم إعداد هوية V2 بعد.",mismatch:"كلمتا المرور غير متطابقتين.",saved:"تم حفظ هوية V2. يمكن الآن استخدام صفحة تسجيل الدخول العامة."}};
  const language=()=>["fr","en","ar"].includes(localStorage.getItem("workcrute-admin-language"))?localStorage.getItem("workcrute-admin-language"):"fr",t=key=>messages[language()][key],renderState=result=>{state.textContent=result.configured?t("configured"):t("empty");};let accountState=null;
  window.adminApi("/api/admin/v2/account").then((result) => {
    accountState=result;renderState(result);
    if (result.account) {
      form.elements.firstName.value = result.account.first_name;
      form.elements.lastName.value = result.account.last_name;
    }
  }).catch((failure) => { state.textContent = failure.message; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    if (!form.checkValidity()) { form.reportValidity();return; }
    if (form.elements.password.value !== form.elements.confirmation.value) { error.textContent = t("mismatch");return; }
    const button = form.querySelector('[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    try {
      await window.adminApi("/api/admin/v2/account", {method:"PUT",body:JSON.stringify({firstName:form.elements.firstName.value,lastName:form.elements.lastName.value,password:form.elements.password.value})});
      form.elements.password.value = "";form.elements.confirmation.value = "";
      state.textContent = t("saved");accountState={configured:true};
      setTimeout(()=>location.replace('/connexion/'),1500);
    } catch (failure) { error.textContent = failure.message; }
    finally { button.disabled = false; }
  });
  window.addEventListener("admin:language",()=>{if(accountState)renderState(accountState);});
})();
