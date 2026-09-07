(() => {
  const form = document.querySelector("[data-v2-login]");
  if (!form) return;
  const error = form.querySelector("[data-login-error]");
  const submit = form.querySelector("[data-login-submit]");
  const i18n = window.workcrutePublicI18n;
  let sending = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    const fields = [...form.querySelectorAll("[required]")];
    const invalid = fields.find((field) => !field.checkValidity());
    fields.forEach((field) => field.setAttribute("aria-invalid", String(!field.checkValidity())));
    if (invalid) { error.textContent = i18n.t("v2_login_required");invalid.focus();return; }
    sending = true;submit.disabled = true;submit.textContent = i18n.t("v2_login_loading");error.textContent = "";
    try {
      const response = await fetch("/api/v2/auth/login", { method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.userMessage || i18n.t("v2_login_error"));
      if (result.account?.language) i18n.apply(result.account.language);
      location.replace(result.redirect);
    } catch (failure) { error.textContent = failure.message || i18n.t("v2_login_error"); }
    finally { sending=false;submit.disabled=false;submit.textContent=i18n.t("login_button"); }
  });
})();
