(() => {
  const form = document.querySelector("[data-v2-admin-account]");
  if (!form || !window.adminApi) return;
  const state = document.querySelector("[data-v2-admin-state]");
  const error = document.querySelector("[data-v2-admin-error]");
  window.adminApi("/api/admin/v2/account").then((result) => {
    state.textContent = result.configured ? "L’identité V2 est configurée. Un nouvel enregistrement remplacera le mot de passe et révoquera les sessions V2 actives." : "Aucune identité V2 n’est encore configurée.";
    if (result.account) {
      form.elements.firstName.value = result.account.first_name;
      form.elements.lastName.value = result.account.last_name;
    }
  }).catch((failure) => { state.textContent = failure.message; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    if (!form.checkValidity()) { form.reportValidity();return; }
    if (form.elements.password.value !== form.elements.confirmation.value) { error.textContent = "Les mots de passe ne correspondent pas.";return; }
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      await window.adminApi("/api/admin/v2/account", {method:"PUT",body:JSON.stringify({firstName:form.elements.firstName.value,lastName:form.elements.lastName.value,password:form.elements.password.value})});
      form.elements.password.value = "";form.elements.confirmation.value = "";
      state.textContent = "Identité V2 enregistrée. Utilisez désormais la page de connexion publique.";
    } catch (failure) { error.textContent = failure.message; }
    finally { button.disabled = false; }
  });
})();
