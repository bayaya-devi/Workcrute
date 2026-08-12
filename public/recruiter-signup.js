(() => {
  const form = document.querySelector("[data-recruiter-signup]");
  if (!form) return;
  let step = 0;
  const steps = [...form.querySelectorAll(".step")];
  const bar = form.querySelector(".progress i");
  const label = form.querySelector("[data-step-label]");
  const back = form.querySelector("[data-back]");
  const next = form.querySelector("[data-next]");
  const submit = form.querySelector('[type="submit"]');
  const error = form.querySelector(".error");
  const t = key => window.workcrutePublicI18n?.t(key) || key;
  const language = () => window.workcrutePublicI18n?.getLanguage?.() || "fr";
  const messages = {
    fr:{mismatch:"Les mots de passe ne correspondent pas.",invalid:"Vérifiez les informations de cette étape.",create:"Création…",failure:"Nous n’avons pas pu créer le compte.",account:"Compte",company:"Entreprise",domain:"Domaine"},
    en:{mismatch:"Passwords do not match.",invalid:"Review the information in this step.",create:"Creating account…",failure:"We could not create the account.",account:"Account",company:"Company",domain:"Industry"},
    ar:{mismatch:"كلمتا المرور غير متطابقتين.",invalid:"راجع معلومات هذه الخطوة.",create:"جارٍ إنشاء الحساب…",failure:"تعذر إنشاء الحساب.",account:"الحساب",company:"الشركة",domain:"القطاع"}
  };
  const message = key => (messages[language()] || messages.fr)[key];
  const validPassword = value => value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);

  function update() {
    steps.forEach((node, index) => node.classList.toggle("active", index === step));
    bar.style.width = `${((step + 1) / steps.length) * 100}%`;
    label.textContent = `${t("step")} ${step + 1} ${t("of")} ${steps.length}`;
    back.hidden = step === 0;
    next.hidden = step === steps.length - 1;
    submit.hidden = step !== steps.length - 1;
    const summary = form.querySelector("[data-summary]");
    if (step === steps.length - 1) summary.textContent = `${message("account")} : ${form.firstName.value} ${form.lastName.value} · ${form.email.value} | ${message("company")} : ${form.companyName.value} | ${message("domain")} : ${form.companySector.value === "other" ? form.otherCompanySector.value : form.companySector.options[form.companySector.selectedIndex]?.text}`;
  }
  function validate() {
    const fields = [...steps[step].querySelectorAll("[required]")];
    const fieldsValid = fields.every(field => field.reportValidity());
    const passwordValid = step !== 0 || (validPassword(form.password.value) && form.password.value === form.confirmPassword.value);
    if (!fieldsValid || !passwordValid) {
      error.textContent = form.password.value !== form.confirmPassword.value ? message("mismatch") : message("invalid");
      return false;
    }
    error.textContent = "";
    return true;
  }

  form.password.addEventListener("input", () => {
    const value = form.password.value;
    const rules = { length:value.length >= 8, lower:/[a-z]/.test(value), upper:/[A-Z]/.test(value), digit:/\d/.test(value), special:/[^A-Za-z0-9]/.test(value) };
    Object.entries(rules).forEach(([key, ok]) => form.querySelector(`[data-rule="${key}"]`)?.classList.toggle("is-valid", ok));
  });
  form.querySelectorAll("[data-password-toggle]").forEach(button => button.addEventListener("click", () => { const input = button.parentElement.querySelector("input"); input.type = input.type === "password" ? "text" : "password"; button.textContent = t(input.type === "password" ? "show" : "hide"); }));
  [[form.companySector, "[data-other-domain]"], [form.plannedHires, "[data-other-hires]"], [form.hiringDelay, "[data-other-delay]"]].forEach(([select, selector]) => select.addEventListener("change", () => { const field = form.querySelector(selector); field.hidden = select.value !== "other"; field.querySelector("input").required = select.value === "other"; }));
  next.addEventListener("click", () => { if (validate()) { step += 1; update(); } });
  back.addEventListener("click", () => { step = Math.max(0, step - 1); update(); });
  document.addEventListener("workcrute:language", update);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submit.disabled || !validate()) return;
    const idleLabel = submit.textContent;
    submit.disabled = true;
    submit.textContent = message("create");
    try {
      const data = Object.fromEntries(new FormData(form));
      data.acceptedTerms = true;
      data.role = "recruiter";
      data.companySector = data.companySector === "other" ? data.otherCompanySector : data.companySector;
      await window.workcrute.api("/api/auth/register", { method:"POST", body:JSON.stringify(data) });
      window.workcrute.go("/recruteur/tableau-de-bord");
    } catch (err) { error.textContent = err.message || message("failure"); }
    finally { submit.disabled = false; submit.textContent = idleLabel; }
  });
  update();
})();
