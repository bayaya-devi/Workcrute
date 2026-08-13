(() => {
  const form = document.querySelector("[data-admin-auth]");
  if (!form) return;
  const status = form.querySelector("[data-status]");
  const title = document.querySelector("[data-step-title]");
  const label = form.querySelector("[data-secret-label]");
  const button = form.querySelector("button[type=submit]");
  const steps = document.querySelectorAll("[data-step-indicator]");
  let step = 1;
  const copy = {
    fr: { one:"Premier niveau",two:"Deuxième niveau",s1:"Secret de niveau 1",s2:"Secret de niveau 2",continue:"Continuer",login:"Ouvrir le Control Center",loading:"Vérification sécurisée…",unavailable:"Le backend sécurisé n’est pas disponible sur cette adresse." },
    en: { one:"First level",two:"Second level",s1:"Level 1 secret",s2:"Level 2 secret",continue:"Continue",login:"Open Control Center",loading:"Secure verification…",unavailable:"The secure backend is unavailable at this address." },
    ar: { one:"المستوى الأول",two:"المستوى الثاني",s1:"سر المستوى الأول",s2:"سر المستوى الثاني",continue:"متابعة",login:"فتح مركز التحكم",loading:"جارٍ التحقق الآمن…",unavailable:"الخادم الآمن غير متاح على هذا العنوان." },
  };
  const lang = () => document.documentElement.lang in copy ? document.documentElement.lang : "fr";
  const render = () => {
    const text = copy[lang()];
    title.textContent = step === 1 ? text.one : text.two;
    label.textContent = step === 1 ? text.s1 : text.s2;
    button.textContent = step === 1 ? text.continue : text.login;
    steps.forEach((item, index) => item.classList.toggle("active", index < step));
    form.secret.value = "";
    form.secret.focus();
  };
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.className = "adm-status";
    status.textContent = copy[lang()].loading;
    button.disabled = true;
    try {
      const response = await fetch(`/api/admin/auth/step-${step}`, {
        method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},
        body:JSON.stringify({ secret: form.secret.value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || copy[lang()].unavailable);
      if (step === 1) { step = 2; status.textContent = ""; render(); }
      else location.assign("/admin/tableau-de-bord/");
    } catch (error) {
      status.className = "adm-status error";
      status.textContent = error.message;
      form.secret.select();
    } finally { button.disabled = false; }
  });
  render();
})();
